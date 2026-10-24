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

Delivery times: the site states one headline, **"typically 7–15 business days" after dispatch** (`DELIVERY_TIME`),
plus a regional table of estimates (`DELIVERY_BY_REGION`: Europe 7–12, North America 8–15, Oceania 10–18,
Middle East 5–10, rest of world 10–25). The regional values are still to be **CONFIRMED with the carrier**.
When they change, edit only `src/config/store.ts`; every page and the structured data follow, and
`npm run check:claims` fails if a translation states a different headline range. In quotes, never promise a faster time than the
site states for that region.

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
| Estimated delivery       | Processing 1–2 business days + delivery: the site promises "typically 7–15 business days"; for remote regions use the site's regional table and say it may take longer |
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
> Import duties or taxes, if your country charges them, are paid by you (in some countries the carrier collects them).
> To send it we will need your full delivery address and a phone number for the courier.
> This quote is held for 48 hours. If you accept it, that is your order, with an obligation to pay.
> Would you like us to go ahead?

**B2. Order confirmation (after the customer accepts; send as an email or a PDF on WhatsApp)**

The terms promise a confirmation on a **durable medium** (an email, or a PDF/document on WhatsApp, not just a chat
bubble), including the withdrawal information. Use `docs/templates/invoice.md` as the base and add:

> Order GTH-YYMM-NNNN — confirmed on [date]. Pieces: […]. Total paid / to pay: [ ] USD, including shipping
> [ ] USD. Estimated delivery: [date range]. Seller: [legal name, address, WhatsApp, email].
> Right of withdrawal (EU/UK consumers): you can withdraw within 14 days of receiving the goods without giving a
> reason, by telling us clearly (WhatsApp or email) or with the form at https://your-domain/en/withdrawal.
> We refund the price and standard outbound shipping within 14 days of your notice, the way you paid us.

If you cannot ship by the estimated date, tell the customer and offer cancellation with a full refund.

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

## 10. Templates and records

Files in `docs/templates/` (open the CSV files in any spreadsheet app):

- **`orders.csv`**: the order sheet, one row per order (number, dates, customer, country, items with SKUs, totals,
  payment, carrier, tracking, status, notes). Order numbers follow section 2.
- **`refunds.csv`**: the refund log: order number, date of the request, reason (change of mind, statutory
  withdrawal, damaged, faulty, lost), pieces, amount refunded (USD), outbound shipping refunded (yes/no), method
  (same way as paid), date refunded, notes. Keep it with the order records.
- **`packing-list.md`**: printed and put inside every parcel.
- **`invoice.md`**: a simple invoice / order confirmation (also the durable-medium confirmation, B2).

The order messages from the site list each piece with its **English name and SKU** (e.g. `GTH-001`) after the
customer's language, and a line "Site language: …". Use the SKU in the order sheet.

## 11. WhatsApp templates in the other languages

Short versions of the greeting / auto-reply, the confirmation and the dispatch notice. Replace the brackets.

**Français**
> Paix à vous, et merci d'avoir écrit à Gethsemane. Nous avons bien reçu votre demande et vous répondons au plus
> vite (du lundi au vendredi, 9 h–17 h, heure de Bethléem).
> Votre commande GTH-[…] est confirmée : total [ ] USD, livraison estimée [dates]. Vous recevrez la confirmation
> écrite par e-mail ou en document.
> Votre commande GTH-[…] est partie. Suivi : [numéro]. Livraison estimée : [dates].

**Español**
> La paz sea contigo, y gracias por escribir a Gethsemane. Hemos recibido tu solicitud y te responderemos lo antes
> posible (de lunes a viernes, de 9:00 a 17:00, hora de Belén).
> Tu pedido GTH-[…] está confirmado: total [ ] USD, entrega estimada [fechas]. Te enviaremos la confirmación por
> escrito por correo o como documento.
> Tu pedido GTH-[…] ya está en camino. Seguimiento: [número]. Entrega estimada: [fechas].

**Italiano**
> Pace a te, e grazie per aver scritto a Gethsemane. Abbiamo ricevuto la tua richiesta e ti risponderemo al più
> presto (dal lunedì al venerdì, 9:00–17:00, ora di Betlemme).
> Il tuo ordine GTH-[…] è confermato: totale [ ] USD, consegna stimata [date]. Riceverai la conferma scritta via
> email o come documento.
> Il tuo ordine GTH-[…] è partito. Tracciamento: [numero]. Consegna stimata: [date].

**Deutsch**
> Friede sei mit Ihnen, und danke für Ihre Nachricht an Gethsemane. Wir haben Ihre Anfrage erhalten und antworten
> so bald wie möglich (Montag bis Freitag, 9–17 Uhr Ortszeit Bethlehem).
> Ihre Bestellung GTH-[…] ist bestätigt: Gesamtbetrag [ ] USD, voraussichtliche Lieferung [Daten]. Die schriftliche
> Bestätigung erhalten Sie per E-Mail oder als Dokument.
> Ihre Bestellung GTH-[…] ist unterwegs. Sendungsnummer: [Nummer]. Voraussichtliche Lieferung: [Daten].

**Ελληνικά**
> Ειρήνη σε εσάς, και ευχαριστούμε που γράψατε στη Gethsemane. Λάβαμε το αίτημά σας και θα απαντήσουμε το
> συντομότερο (Δευτέρα–Παρασκευή, 09:00–17:00, ώρα Βηθλεέμ).
> Η παραγγελία σας GTH-[…] επιβεβαιώθηκε: σύνολο [ ] USD, εκτιμώμενη παράδοση [ημερομηνίες]. Θα λάβετε τη γραπτή
> επιβεβαίωση με email ή ως έγγραφο.
> Η παραγγελία σας GTH-[…] στάλθηκε. Αριθμός αποστολής: [αριθμός]. Εκτιμώμενη παράδοση: [ημερομηνίες].

**Polski**
> Pokój z Tobą i dziękujemy za wiadomość do Gethsemane. Otrzymaliśmy Twoje zapytanie i odpowiemy najszybciej, jak
> to możliwe (od poniedziałku do piątku, 9:00–17:00 czasu betlejemskiego).
> Twoje zamówienie GTH-[…] jest potwierdzone: razem [ ] USD, szacowana dostawa [daty]. Pisemne potwierdzenie
> wyślemy e-mailem lub jako dokument.
> Twoje zamówienie GTH-[…] zostało wysłane. Numer przesyłki: [numer]. Szacowana dostawa: [daty].

**Română**
> Pace ție și mulțumim că ai scris la Gethsemane. Am primit cererea ta și îți răspundem cât mai curând (de luni
> până vineri, 9:00–17:00, ora Betleemului).
> Comanda ta GTH-[…] este confirmată: total [ ] USD, livrare estimată [date]. Vei primi confirmarea scrisă pe
> e-mail sau ca document.
> Comanda ta GTH-[…] a plecat. Număr de urmărire: [număr]. Livrare estimată: [date].

**Українська**
> Мир вам, і дякуємо, що написали до Gethsemane. Ми отримали ваш запит і відповімо якнайшвидше (з понеділка до
> п'ятниці, 9:00–17:00 за часом Вифлеєма).
> Ваше замовлення GTH-[…] підтверджено: разом [ ] USD, орієнтовна доставка [дати]. Письмове підтвердження ми
> надішлемо електронною поштою або документом.
> Ваше замовлення GTH-[…] відправлено. Номер відстеження: [номер]. Орієнтовна доставка: [дати].

**Português**
> A paz esteja consigo, e obrigado por escrever à Gethsemane. Recebemos o seu pedido e respondemos o mais depressa
> possível (de segunda a sexta, 9:00–17:00, hora de Belém).
> A sua encomenda GTH-[…] está confirmada: total [ ] USD, entrega estimada [datas]. Enviaremos a confirmação
> escrita por e-mail ou em documento.
> A sua encomenda GTH-[…] foi enviada. Seguimento: [número]. Entrega estimada: [datas].
