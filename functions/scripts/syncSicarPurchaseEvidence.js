'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');

let admin = null;

const DEFAULT_PROJECT_ID = 'estado-resultados-a0a81';
const DEFAULT_STORAGE_BUCKET = 'estado-resultados-a0a81.firebasestorage.app';
const DEFAULT_QUEUE_DIRECTORY = 'C:\\SICAR\\state\\sicar-purchase-accounting';
const MAX_EVIDENCE_BYTES = 15 * 1024 * 1024;
const SUPPORTED_CONTENT_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

function loadEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return;

  fs.readFileSync(filePath, 'utf8').split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const separator = trimmed.indexOf('=');
    if (separator < 1) return;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  });
}

function loadEnvironment() {
  const functionsRoot = path.resolve(__dirname, '..');
  const projectRoot = path.resolve(functionsRoot, '..');
  loadEnvFile(process.env.CSM_ACCOUNTING_EVIDENCE_ENV);
  loadEnvFile(path.join(projectRoot, '.env.local'));
  loadEnvFile(path.join(functionsRoot, '.env.local'));
}

function requireEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Falta ${name} en la configuracion local.`);
  return value;
}

function getConfig() {
  return {
    projectId: process.env.FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET,
    companyId: requireEnv('CSM_ACCOUNTING_COMPANY_ID'),
    branchId: requireEnv('SICAR_BRANCH_ID'),
    branchName: requireEnv('SICAR_BRANCH_NAME'),
    queueDirectory: path.resolve(
      process.env.SICAR_PURCHASE_ACCOUNTING_METADATA_DIRECTORY || DEFAULT_QUEUE_DIRECTORY
    ),
  };
}

function parseArgs(argv) {
  const limitValue = argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1];
  const limit = Math.min(100, Math.max(1, Number(limitValue || 30)));
  return {
    preview: argv.includes('--preview'),
    force: argv.includes('--force'),
    limit: Number.isFinite(limit) ? Math.trunc(limit) : 30,
  };
}

function safePart(value, fallback = 'registro') {
  return String(value || fallback)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100) || fallback;
}

function normalizeComparable(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function isPathInside(rootDirectory, candidatePath) {
  const relative = path.relative(path.resolve(rootDirectory), path.resolve(candidatePath || ''));
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function readMetadata(metadataPath) {
  return JSON.parse(fs.readFileSync(metadataPath, 'utf8').replace(/^\uFEFF/, ''));
}

function writeMetadata(metadataPath, metadata) {
  const temporaryPath = `${metadataPath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  fs.renameSync(temporaryPath, metadataPath);
}

function listMetadataFiles(queueDirectory, limit, deliveryKey, force) {
  if (!fs.existsSync(queueDirectory)) return [];
  return fs.readdirSync(queueDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^compra_[a-zA-Z0-9_-]+\.json$/i.test(entry.name))
    .map((entry) => {
      const filePath = path.join(queueDirectory, entry.name);
      return { filePath, modifiedAt: fs.statSync(filePath).mtimeMs };
    })
    .filter((entry) => {
      if (force) return true;
      try {
        return readMetadata(entry.filePath).accountingDeliveries?.[deliveryKey]?.status !== 'done';
      } catch {
        return true;
      }
    })
    .sort((left, right) => left.modifiedAt - right.modifiedAt)
    .slice(0, limit)
    .map((entry) => entry.filePath);
}

function getDeliveryKey(config) {
  return `${config.projectId}:${config.companyId}:${config.branchId}`;
}

function buildEvidenceIdentity(config, sourceRecordId, contentHash) {
  return `sicar_invoice_${safePart(config.branchId)}_${safePart(sourceRecordId)}_${contentHash.slice(0, 12)}`;
}

function buildObjectPath(config, metadata, contentHash, extension) {
  const sourceRecordId = safePart(metadata.sourceRecordId || metadata.purchaseId);
  const ownerId = safePart(`sicar_compra_${config.branchId}_${sourceRecordId}`);
  return `expense-receipts/${safePart(config.companyId)}/${ownerId}/${contentHash.slice(0, 16)}_factura.${extension}`;
}

function matchesBranch(data, config) {
  const expected = new Set([
    normalizeComparable(config.branchId),
    normalizeComparable(config.branchName),
  ]);
  const candidates = [data?.branch, data?.branchId, data?.branchName, data?.sucursal]
    .map(normalizeComparable)
    .filter(Boolean);
  return candidates.some((candidate) => expected.has(candidate));
}

function mergeEvidenceAttachment(existingAttachments, attachment) {
  const current = Array.isArray(existingAttachments) ? existingAttachments : [];
  const filtered = current.filter((item) => {
    if (!item?.url) return false;
    if (item.id === attachment.id) return false;
    if (item.path && attachment.path && item.path === attachment.path) return false;
    return !(
      item.sourceSystem === 'SICAR'
      && String(item.sourceRecordId || '') === String(attachment.sourceRecordId || '')
      && normalizeComparable(item.branch) === normalizeComparable(attachment.branch)
    );
  });
  return [...filtered, attachment];
}

function initFirebase(config) {
  admin ||= require('firebase-admin');
  if (admin.apps.length) return admin.firestore();
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: config.projectId,
    storageBucket: config.storageBucket,
  });
  return admin.firestore();
}

function buildDownloadUrl(bucketName, objectPath, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
}

async function uploadEvidence(config, metadata, localPath, contentHash, preview) {
  const contentType = String(metadata.invoiceSupport?.contentType || 'image/jpeg').toLowerCase();
  const extension = SUPPORTED_CONTENT_TYPES.get(contentType);
  if (!extension) throw new Error(`Tipo de foto no permitido: ${contentType}.`);

  const fileSize = fs.statSync(localPath).size;
  if (fileSize <= 0 || fileSize > MAX_EVIDENCE_BYTES) {
    throw new Error('La foto debe pesar entre 1 byte y 15 MB.');
  }

  const objectPath = buildObjectPath(config, metadata, contentHash, extension);
  const attachment = {
    id: buildEvidenceIdentity(config, metadata.sourceRecordId, contentHash),
    name: String(metadata.invoiceSupport?.fileName || `factura.${extension}`).slice(0, 160),
    url: preview ? 'preview://factura' : '',
    path: objectPath,
    contentType,
    size: fileSize,
    uploadedAt: new Date().toISOString(),
    source: 'csm-operaciones',
    sourceSystem: 'SICAR',
    sourceRecordId: String(metadata.sourceRecordId),
    branch: config.branchId,
    branchName: config.branchName,
    companyId: config.companyId,
    type: 'invoice',
    label: 'Factura / soporte principal',
  };
  if (preview) return attachment;

  const bucket = admin.storage().bucket(config.storageBucket);
  const storageFile = bucket.file(objectPath);
  const [exists] = await storageFile.exists();
  let token = '';

  if (!exists) {
    token = randomUUID();
    await bucket.upload(localPath, {
      destination: objectPath,
      metadata: {
        contentType,
        metadata: {
          firebaseStorageDownloadTokens: token,
          companyId: config.companyId,
          branchId: config.branchId,
          sourceRecordId: String(metadata.sourceRecordId),
          sourceSystem: 'SICAR',
        },
      },
    });
  } else {
    const [fileMetadata] = await storageFile.getMetadata();
    token = String(fileMetadata.metadata?.firebaseStorageDownloadTokens || '').split(',')[0].trim();
    if (!token) {
      token = randomUUID();
      await storageFile.setMetadata({
        metadata: {
          ...(fileMetadata.metadata || {}),
          firebaseStorageDownloadTokens: token,
        },
      });
    }
  }

  attachment.url = buildDownloadUrl(bucket.name, objectPath, token);
  return attachment;
}

function addReference(referenceMap, ref, data, config) {
  if (!ref || !data || !matchesBranch(data, config)) return;
  referenceMap.set(ref.path, { ref, data });
}

async function getVerifiedDocument(collection, documentId, config) {
  if (!documentId) return null;
  const snapshot = await collection.doc(String(documentId)).get();
  if (!snapshot.exists || !matchesBranch(snapshot.data(), config)) return null;
  return { ref: snapshot.ref, data: snapshot.data() };
}

async function querySourceRecord(collection, sourceRecordId, config) {
  const values = [String(sourceRecordId)];
  const numericValue = Number(sourceRecordId);
  if (Number.isFinite(numericValue)) values.push(numericValue);

  const snapshots = await Promise.all(values.map((value) => (
    collection.where('sourceRecordId', '==', value).limit(20).get()
  )));
  const matches = new Map();
  snapshots.forEach((snapshot) => snapshot.docs.forEach((doc) => {
    if (matchesBranch(doc.data(), config)) matches.set(doc.ref.path, { ref: doc.ref, data: doc.data() });
  }));
  return [...matches.values()];
}

async function findAccountingTargets(db, config, metadata) {
  const targets = new Map();
  const sourceRecordId = String(metadata.sourceRecordId || metadata.purchaseId || '').trim();
  if (!sourceRecordId) throw new Error('El complemento no contiene sourceRecordId.');

  const collections = {
    purchases: db.collection('compras'),
    payables: db.collection('cuentas_por_pagar'),
    dailyExpenses: db.collection('gastosDiarios'),
  };
  const rawIds = [...new Set([
    metadata.rawId,
    `compra_${sourceRecordId}`,
    sourceRecordId,
  ].filter(Boolean).map(String))];

  for (const rawId of rawIds) {
    // The staging document is trusted only after verifying its branch.
    // eslint-disable-next-line no-await-in-loop
    const rawSnapshot = await db.collection('integraciones_privadas').doc('sicar')
      .collection('compras_raw').doc(rawId).get();
    if (!rawSnapshot.exists || !matchesBranch(rawSnapshot.data(), config)) continue;
    const ids = rawSnapshot.data()?.targetDocIds || {};
    const candidates = await Promise.all([
      getVerifiedDocument(collections.purchases, ids.compraId, config),
      getVerifiedDocument(collections.payables, ids.cuentaPorPagarId, config),
      getVerifiedDocument(collections.dailyExpenses, ids.gastoDiarioId, config),
    ]);
    candidates.filter(Boolean).forEach((entry) => targets.set(entry.ref.path, entry));
  }

  const queried = await Promise.all([
    querySourceRecord(collections.purchases, sourceRecordId, config),
    querySourceRecord(collections.payables, sourceRecordId, config),
    querySourceRecord(collections.dailyExpenses, sourceRecordId, config),
  ]);
  queried.flat().forEach((entry) => targets.set(entry.ref.path, entry));

  const purchaseEntries = [...targets.values()].filter((entry) => entry.ref.parent.id === 'compras');
  for (const purchase of purchaseEntries) {
    const ids = [
      [collections.payables, purchase.data.linkedPayableId || purchase.data.sourceFacturaId],
      [collections.dailyExpenses, purchase.data.sourceGastoDiarioId],
    ];
    for (const [collection, documentId] of ids) {
      // eslint-disable-next-line no-await-in-loop
      const linked = await getVerifiedDocument(collection, documentId, config);
      if (linked) targets.set(linked.ref.path, linked);
    }
  }

  return [...targets.values()];
}

async function attachEvidence(db, targets, attachment, preview) {
  if (!targets.length) return [];
  if (preview) return targets.map((target) => target.ref.path);

  const batch = db.batch();
  const FieldValue = admin.firestore.FieldValue;
  targets.forEach(({ ref, data }) => {
    const attachments = mergeEvidenceAttachment(data.attachments, attachment);
    const support = {
      ...attachment,
      source: 'proveedores-app',
      sourceCollection: 'compras',
      sourceDocId: ref.parent.id === 'compras' ? ref.id : (data.linkedPurchaseId || data.mirroredPurchaseId || ''),
    };
    batch.set(ref, {
      attachments,
      attachmentCount: attachments.length,
      attachmentUrl: attachment.url,
      attachmentPath: attachment.path,
      fotoFacturaUrl: attachment.url,
      fotoFacturaPath: attachment.path,
      support,
      supportFiles: [support],
      accountingEvidenceSource: 'csm-operaciones',
      accountingEvidenceSyncedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  await batch.commit();
  return targets.map((target) => target.ref.path);
}

function recordFailure(metadataPath, metadata, deliveryKey, error) {
  const previous = metadata.accountingDeliveries?.[deliveryKey] || {};
  const message = String(error?.message || error || 'Error desconocido').slice(0, 500);
  metadata.accountingDeliveries = {
    ...(metadata.accountingDeliveries || {}),
    [deliveryKey]: {
      ...previous,
      status: 'pending',
      lastError: message,
      lastAttemptAt: new Date().toISOString(),
    },
  };
  writeMetadata(metadataPath, metadata);
}

async function processMetadataFile(db, config, metadataPath, options) {
  const metadata = readMetadata(metadataPath);
  if (!metadata.invoiceSupport?.localPath) return { status: 'ignored', reason: 'without_photo' };
  if ((metadata.branchId || metadata.branchName) && !matchesBranch(metadata, config)) {
    throw new Error('La evidencia pertenece a otra empresa o sucursal.');
  }

  const deliveryKey = getDeliveryKey(config);
  const existingDelivery = metadata.accountingDeliveries?.[deliveryKey];
  const localPath = path.resolve(metadata.invoiceSupport.localPath);
  if (!isPathInside(config.queueDirectory, localPath)) {
    throw new Error('La foto esta fuera del directorio autorizado.');
  }
  if (!fs.existsSync(localPath)) {
    if (existingDelivery?.status === 'done') return { status: 'unchanged', sourceRecordId: metadata.sourceRecordId };
    throw new Error('No se encontro la foto local pendiente.');
  }

  const contentHash = createHash('sha256').update(fs.readFileSync(localPath)).digest('hex');
  if (!options.force && existingDelivery?.status === 'done' && existingDelivery.contentHash === contentHash) {
    return { status: 'unchanged', sourceRecordId: metadata.sourceRecordId };
  }

  const targets = await findAccountingTargets(db, config, metadata);
  if (!targets.length) {
    throw new Error(`La compra SICAR ${metadata.sourceRecordId} aun no existe en el sistema contable.`);
  }

  const attachment = await uploadEvidence(config, metadata, localPath, contentHash, options.preview);
  const targetPaths = await attachEvidence(db, targets, attachment, options.preview);
  if (!options.preview) {
    metadata.accountingDeliveries = {
      ...(metadata.accountingDeliveries || {}),
      [deliveryKey]: {
        status: 'done',
        contentHash,
        attachment,
        targetPaths,
        deliveredAt: new Date().toISOString(),
        lastError: null,
      },
    };
    writeMetadata(metadataPath, metadata);
  }

  return {
    status: options.preview ? 'preview' : 'done',
    sourceRecordId: String(metadata.sourceRecordId),
    targetCount: targetPaths.length,
  };
}

async function main() {
  loadEnvironment();
  const options = parseArgs(process.argv.slice(2));
  const config = getConfig();
  const db = initFirebase(config);
  const files = listMetadataFiles(
    config.queueDirectory,
    options.limit,
    getDeliveryKey(config),
    options.force
  );
  const results = [];

  for (const metadataPath of files) {
    let metadata = null;
    try {
      metadata = readMetadata(metadataPath);
      // eslint-disable-next-line no-await-in-loop
      const result = await processMetadataFile(db, config, metadataPath, options);
      results.push({ file: path.basename(metadataPath), ...result });
    } catch (error) {
      if (!options.preview && metadata) recordFailure(metadataPath, metadata, getDeliveryKey(config), error);
      results.push({ file: path.basename(metadataPath), status: 'pending', error: String(error.message || error) });
    }
  }

  const failed = results.filter((result) => result.status === 'pending');
  console.log(JSON.stringify({
    ok: failed.length === 0,
    preview: options.preview,
    companyId: config.companyId,
    branchId: config.branchId,
    scanned: files.length,
    delivered: results.filter((result) => result.status === 'done').length,
    pending: failed.length,
    results,
  }, null, 2));
  if (failed.length) process.exitCode = 2;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}

module.exports = {
  buildEvidenceIdentity,
  buildObjectPath,
  isPathInside,
  matchesBranch,
  mergeEvidenceAttachment,
  normalizeComparable,
  safePart,
};
