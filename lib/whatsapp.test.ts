import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  formatWhatsAppNumber,
  buildWhatsAppServiceUrl,
  buildWhatsAppInquiryUrl,
} from './whatsapp';

describe('WhatsApp Integration Helpers', () => {
  test('formatWhatsAppNumber converts Nigerian 11-digit numbers to international format', () => {
    assert.strictEqual(formatWhatsAppNumber('08037264419'), '2348037264419');
    assert.strictEqual(formatWhatsAppNumber('08112417171'), '2348112417171');
    assert.strictEqual(formatWhatsAppNumber('07038753234'), '2347038753234');
  });

  test('formatWhatsAppNumber strips +, spaces, and dashes', () => {
    assert.strictEqual(formatWhatsAppNumber('+234 803 726 4419'), '2348037264419');
    assert.strictEqual(formatWhatsAppNumber('+234-811-241-7171'), '2348112417171');
    assert.strictEqual(formatWhatsAppNumber('2348037264419'), '2348037264419');
  });

  test('formatWhatsAppNumber handles null, undefined, and empty', () => {
    assert.strictEqual(formatWhatsAppNumber(null), '');
    assert.strictEqual(formatWhatsAppNumber(undefined), '');
    assert.strictEqual(formatWhatsAppNumber(''), '');
  });

  test('buildWhatsAppServiceUrl creates a structured booking URL with all details', () => {
    const url = buildWhatsAppServiceUrl({
      phone: '+234 803 726 4419',
      orgName: 'Springforth Laundromart',
      serviceName: 'Everyday Wash, Dry & Fold Basket (10kg)',
      price: 8000,
      date: '2026-10-18',
      timeSlot: '09:00',
      address: '21 Spring Road, Essien Town, Calabar',
      notes: 'Please separate whites and colored clothes.',
    });

    assert.ok(url.startsWith('https://wa.me/2348037264419?text='));
    const text = decodeURIComponent(url.split('text=')[1]);
    assert.ok(text.includes('Springforth Laundromart'));
    assert.ok(text.includes('Everyday Wash, Dry & Fold Basket (10kg)'));
    assert.ok(text.includes('8,000'));
    assert.ok(text.includes('2026-10-18 (09:00)'));
    assert.ok(text.includes('21 Spring Road, Essien Town, Calabar'));
    assert.ok(text.includes('Please separate whites and colored clothes.'));
  });

  test('buildWhatsAppInquiryUrl creates general inquiry link', () => {
    const url = buildWhatsAppInquiryUrl({
      phone: '08112417171',
      orgName: 'TECIL Solar Engineering',
      cityName: 'Calabar',
    });

    assert.ok(url.startsWith('https://wa.me/2348112417171?text='));
    const text = decodeURIComponent(url.split('text=')[1]);
    assert.ok(text.includes('TECIL Solar Engineering'));
    assert.ok(text.includes('Calabar'));
  });
});
