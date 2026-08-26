'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const {
  buildObjectPath,
  isPathInside,
  matchesBranch,
  mergeEvidenceAttachment,
} = require('./syncSicarPurchaseEvidence');

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
