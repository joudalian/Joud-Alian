# Changelog

Notable changes to how the shop works. Internal document.

## 2026-10-25: online checkout replaces WhatsApp ordering

- Orders used to be sent as a prefilled WhatsApp message and confirmed by hand (quote, payment instructions).
  The site now works like a standard online shop: cart → checkout → card payment on Stripe Checkout → order
  confirmation by email, with customer accounts, guest checkout, order tracking and an owner admin (`/admin`).
- WhatsApp was removed from the site entirely: the order and contact buttons, the wa.me link builders, the phone
  number in the config, the structured data and the legal pages, the order-message builder and its tests, and every
  translation. Customers now reach the shop by email, the contact form and the social accounts.
- `npm run check:claims`, `check:launch`, `check:i18n` and `tests/channels.spec.ts` fail if the name, the wa.me
  domain or the old number appear again anywhere in `src/`, `messages/` or `docs/` (this file excepted).
