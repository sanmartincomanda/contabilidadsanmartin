'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const {
  buildFixedQuotaAccountingPatch,
  buildFixedQuotaTreatmentHash,
  buildObjectPath,
  isPathInside,
  matchesBranch,
  matchesBusinessIdentity,
  mergeEvidenceAttachment,
} = require('./syncSicarPurchaseEvidence');

const fixedQuotaMetadata = {
  supplierTaxRegime: 'fixed-quota',
  excludeRecoverableVat: true,
  accountingSubtotal: 100,
  accountingTaxTotal: 0,
  accountingTotal: 100,
  sicarSubtotal: 100,
  sicarTaxTotal: 15,
  sicarTotal: 115,
};

const amparito = {
  projectId: 'estado-resultados-a0a81',
  companyId: 'carnes_amparito',
  branchId: 'amparito',
  branchName: 'CARNES AMPARITO',
};

test('la evidencia queda aislada por empresa en Storage', () => {
  const objectPath = buildObjectPath(amparito, { sourceRecordId: '125' }, 'a'.repeat(64), 'jpg');
  assert.equal(
    objectPath,
    'expense-receipts/carnes_amparito/sicar_compra_amparito_125/aaaaaaaaaaaaaaaa_factura.jpg'
  );
});

test('un documento de Masaya no coincide con Amparito', () => {
  assert.equal(matchesBranch({ branch: 'san_martin_masaya' }, amparito), false);
  assert.equal(matchesBranch({ branchName: 'CARNES AMPARITO' }, amparito), true);
});

test('recupera una compra sin com_id solo con identidad comercial exacta', () => {
  const masaya = {
    branchId: 'san_martin_masaya',
    branchName: 'CARNES SAN MARTIN MASAYA',
  };
  const metadata = {
    sourceRecordId: '2288',
    invoiceNumber: 'VB230826',
    supplier: 'MASAYA MERCADO',
    date: '2026-08-26',
    total: 40157.89,
  };
  const purchase = {
    invoiceNumber: 'VB230826',
    supplier: 'MASAYA MERCADO',
    date: '2026-08-26',
    amount: 40157.89,
    branch: 'san_martin_masaya',
  };
  assert.equal(matchesBusinessIdentity(purchase, metadata, masaya), true);
  assert.equal(matchesBusinessIdentity({ ...purchase, amount: 40157.88 }, metadata, masaya), false);
  assert.equal(matchesBusinessIdentity({ ...purchase, supplier: 'OTRO PROVEEDOR' }, metadata, masaya), false);
  assert.equal(matchesBusinessIdentity({ ...purchase, branch: 'amparito' }, metadata, masaya), false);
});

test('no reemplaza un com_id contable diferente', () => {
  const masaya = {
    branchId: 'san_martin_masaya',
    branchName: 'CARNES SAN MARTIN MASAYA',
  };
  const metadata = {
    sourceRecordId: '2288',
    invoiceNumber: 'VB230826',
    supplier: 'MASAYA MERCADO',
    date: '2026-08-26',
    total: 40157.89,
  };
  const purchase = {
    ...metadata,
    sourceRecordId: '9999',
    amount: metadata.total,
    branch: 'san_martin_masaya',
  };
  assert.equal(matchesBusinessIdentity(purchase, metadata, masaya), false);
});

test('reemplaza solo la foto SICAR del mismo registro y conserva adjuntos manuales', () => {
  const existing = [
    { id: 'manual', url: 'https://example.test/manual.jpg' },
    {
      id: 'old',
      url: 'https://example.test/old.jpg',
      sourceSystem: 'SICAR',
      sourceRecordId: '125',
      branch: 'amparito',
    },
  ];
  const replacement = {
    id: 'new',
    url: 'https://example.test/new.jpg',
    sourceSystem: 'SICAR',
    sourceRecordId: '125',
    branch: 'amparito',
  };
  assert.deepEqual(mergeEvidenceAttachment(existing, replacement).map((item) => item.id), ['manual', 'new']);
});

test('rechaza rutas fuera de la cola local autorizada', () => {
  const root = path.resolve('C:\\SICAR\\state\\sicar-purchase-accounting');
  assert.equal(isPathInside(root, path.join(root, 'compra_125.jpg')), true);
  assert.equal(isPathInside(root, 'C:\\Windows\\System32\\archivo.jpg'), false);
});

test('cuota fija reemplaza el total de compra y conserva el total original de SICAR', () => {
  assert.deepEqual(
    buildFixedQuotaAccountingPatch('compras', { amount: 115 }, fixedQuotaMetadata),
    {
      supplierTaxRegime: 'fixed-quota',
      excludeRecoverableVat: true,
      ivaAcreditable: 0,
      recoverableVat: 0,
      accountingSubtotal: 100,
      accountingTaxTotal: 0,
      accountingTotal: 100,
      sicarOriginalSubtotal: 100,
      sicarOriginalTaxTotal: 15,
      sicarOriginalTotal: 115,
      accountingTreatmentSource: 'csm-operaciones',
      amount: 100,
    }
  );
});

test('cuota fija conserva abonos existentes al corregir la cuenta por pagar', () => {
  const patch = buildFixedQuotaAccountingPatch(
    'cuentas_por_pagar',
    { monto: 115, saldo: 95 },
    fixedQuotaMetadata
  );
  assert.equal(patch.monto, 100);
  assert.equal(patch.saldo, 80);
  assert.equal(patch.estado, 'pendiente');
});

test('cuota fija rechaza una correccion menor que los abonos existentes', () => {
  assert.throws(
    () => buildFixedQuotaAccountingPatch(
      'cuentas_por_pagar',
      { monto: 115, saldo: 5 },
      fixedQuotaMetadata
    ),
    /abonos existentes superan el total contable/i
  );
});

test('el hash contable cambia cuando cambia el total autorizado', () => {
  const original = buildFixedQuotaTreatmentHash(fixedQuotaMetadata);
  const changed = buildFixedQuotaTreatmentHash({
    ...fixedQuotaMetadata,
    accountingSubtotal: 101,
    accountingTotal: 101,
  });
  assert.notEqual(original, changed);
});
