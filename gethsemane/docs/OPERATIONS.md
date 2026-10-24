# Gethsemane: order operations

Internal guide for handling orders. **Not published on the site.** Times, windows and amounts below follow
`src/config/store.ts`; if you change a value there, change it here too. Values marked CONFIRM are still to be
decided by the owner.

## 1. Order flow at a glance

1. A customer sends an order message from the site (WhatsApp). It lists the pieces, quantities, USD prices and,
   if they filled them in, their name, country, notes and a gift note.
2. Reply within one working day (Mon–Fri 09:00–17:00, Bethlehem time), using template A below.
3. Check stock (section 3) and send a quote (section 4).
4. When the customer accepts, send payment details (template D), according to `PAYMENT_MODE`.
5. Once paid: pack within the processing time (1–2 business days), ship, send tracking (template E).
6. Keep the record (section 8).

## 2. Order numbers

Format: **`GTH-YYMM-NNNN`**

- `GTH` = Gethsemane (the sister store uses its own prefix, so records never mix).
- `YYMM` = year and month the order was **confirmed** (e.g. `2611` for November 2026).
- `NNNN` = running number within that month, starting at `0001`.

Example: the third order confirmed in November 2026 is `GTH-2611-0003`. Assign the number when you send the
quote, never reuse one, and use it in every message, invoice, customs form and the parcel label reference.

## 3. Stock check

Before quoting, for every piece:

- Is it physically in the workshop or the partner stock location? Which one ships it (affects delivery estimate
  and customs)?
- Every piece is handmade: grain, colour and size vary. If the piece in stock differs noticeably from the photo
  (size, colour, a visible knot), send the customer a photo of the actual piece with the quote.
- If something is not available: offer a similar piece with a photo, or a realistic making time. Never promise a
  date you cannot keep.

## 4. Quote

Send one message (template B) containing:

| Field                    | Notes                                                                       |
| ------------------------ | --------------------------------------------------------------------------- |
| Order number             | `GTH-YYMM-NNNN`                                                             |
| Items                    | Name, quantity, unit price in USD                                           |
| Subtotal                 | USD                                                                         |
| Shipping                 | USD, carrier and service (tracked)                                          |
| Total                    | USD; mention that the bank or card may convert to their currency             |
| Ships from               | Bethlehem or the partner stock location                                     |
| Estimated delivery       | Processing 1–2 business days + delivery for their region (see the site's table) |
| Duties and taxes         | Say clearly that import duties/VAT may be charged by their country and are paid by the recipient, unless agreed otherwise |
| Gift wrap / gift note    | If requested                                                                |
| Validity                 | **48 hours** (prices, shipping and stock held until then)                   |

## 5. WhatsApp templates

Adapt the language to the customer (they wrote in it). Keep the tone calm, warm and honest. Do not promise
anything the site does not promise.

**A. First reply**

> Peace be with you, and thank you for writing to Gethsemane. We have received your order request and are
> checking that each piece is ready for you. We will come back to you with the total, shipping and an estimated
> delivery date shortly.

**B. Quote**

> Thank you for waiting. Here is your quote, order **GTH-YYMM-NNNN**:
> • [quantity] × [piece] — [price] USD
> Subtotal: [ ] USD · Shipping ([carrier], tracked): [ ] USD · **Total: [ ] USD**
> Ships from [Bethlehem / partner location]; estimated delivery [date range] after payment.
> Import duties or taxes, if your country charges them, are paid on delivery.
> This quote is held for 48 hours. Would you like us to go ahead?

**C. Item not available**

> We are sorry: the [piece] is not available right now. We have a very similar one (photo attached), or we can
> make it again in about [time]. Which would you prefer?

**D. Payment**

> Thank you! Here is how to pay for order GTH-YYMM-NNNN: [instructions or link]. Please send us a message once
> it is done, and we will prepare your parcel.

**E. Shipped**

> Your order GTH-YYMM-NNNN is on its way. Tracking: [number] ([carrier link]). Estimated delivery: [date range].
> Please keep the packaging until you have unpacked and checked everything.

**F. Delivered / follow-up (a few days after delivery)**

> We hope your pieces arrived safely and bring you joy. If anything is not as expected, just write to us here.
> If you are happy with them, we would be grateful if you told us about it.

**G. Damage report** (customer reports within 7 days of delivery)

> We are very sorry the piece arrived damaged. Could you send photos of the piece, the box and the shipping
> label? We will arrange a replacement or a refund for it.

**H. Return request** (within 14 days of delivery)

> Of course. Please let us know which pieces you are returning; we will send you the return address. The pieces
> need to be unused, in their original packaging, with your order number. Return postage is paid by you unless we
> made a mistake or the piece is faulty; international postage can be expensive, so we are happy to talk it
> through first.

Refund rules (as on the site's returns page): EU/UK consumers withdrawing under the statutory right get the price
and the standard outbound shipping back within 14 days of their withdrawal notice (you may wait until the piece
is back or they show proof of sending). Other customers: the price, within 5–10 business days of receiving and
inspecting the return; original shipping is not refunded unless we made a mistake. Engraved/personalised and
final-sale pieces are excluded (always say so before the order).

**I. Outside opening hours (auto-reply, optional)**

> Thank you for writing to Gethsemane. We answer Monday to Friday, 09:00–17:00 (Bethlehem time) and will reply
> as soon as we are back.

## 6. Packing

- Wrap each piece separately in tissue, then bubble wrap; nativity figures individually.
- Crosses and thin pieces: add a stiff card so they cannot bend or snap.
- Double box for fragile or heavy orders; at least 3 cm of padding on every side; nothing should move when
  shaken.
- Inside the parcel: a printed packing list with the order number, the gift note if requested (no prices in
  gift orders), and a short care card (oil occasionally, keep out of direct heat, see the site's care page).
- Photograph the packed parcel before closing it (useful for damage claims).

## 7. Customs and shipping

- Always use a tracked service. If tracking shows no movement for 20 days, open a trace with the carrier and
  tell the customer.
- Customs declaration: describe the goods precisely, e.g. "Handmade olive wood nativity figures" (not "gift"),
  with the real value in USD and the order number.
- Origin: state the country of origin consistently on the customs form, invoice and packaging. **CONFIRM** the
  exact wording required for the US and the EU with the carrier or a customs adviser (see README, legal
  questions).
- HS codes: wooden ornaments and statuettes are usually under 4420; rosaries can differ. **CONFIRM** with the
  carrier for each product type and keep a list.
- Duties and import VAT are normally paid by the recipient; say so in every quote.
- Wood is a natural material: ask the carrier whether a phytosanitary or fumigation statement is needed for the
  destination country (some, such as Australia, check wooden items strictly).

## 8. Gift wrap and gift notes

- If the customer ticked the gift-note box, copy their note by hand or print it on a card; never include prices.
- Gift wrap: CONFIRM whether it is offered and at what price before mentioning it to customers.
- If the parcel goes straight to the recipient, put the invoice in a separate envelope marked "for customs" or
  send it to the buyer by WhatsApp only, if the carrier allows.

## 9. Record keeping

For every order keep, under its order number:

- The WhatsApp conversation (export it) and the quote as sent.
- Payment confirmation.
- Invoice, customs form, tracking number, photo of the packed parcel.
- Any return or damage report, with photos and what was refunded or replaced.

Keep a simple spreadsheet: order number, date confirmed, customer name and country, items, total USD, payment
date, ship date, carrier, tracking, delivered date, notes. Keep records for as long as tax law requires
(CONFIRM the period, and set `DATA_RETENTION_YEARS` in `src/config/store.ts` to match so the privacy page states
it). Delete personal details you no longer need after that.

Customer details are used only to fulfil the order and are shared only with the carrier. Never add customers to
broadcast lists or marketing without their clear consent.
