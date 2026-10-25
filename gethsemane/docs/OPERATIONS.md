# Gethsemane: order operations

Internal guide for handling orders. **Not published on the site.** Times, windows and amounts below follow
`src/config/store.ts`; if you change a value there, change it here too. Values marked CONFIRM are still to be
decided by the owner.

## 1. Order workflow

Everything a customer does happens on the site; you work in **`/admin`** (open it while signed in with an address
from `ADMIN_EMAILS`) and in the **Stripe Dashboard**.

1. **The customer pays.** Cart → checkout (email, address, shipping method, gift note, coupon) → Stripe's payment
   page. The order is created as **Awaiting payment** with its number.
2. **Stripe confirms the payment** (the webhook): the order turns **Paid** and the customer gets the order
   confirmation email automatically, in their language. You do nothing yet. Unpaid checkouts expire after an hour
   and turn **Cancelled** by themselves.
3. **Check and prepare** (within the processing time, 1–2 business days): open the order in `/admin`, check every
   piece (section 3), set the status to **Being prepared**. Pack (section 5).
4. **Ship**: in `/admin`, enter the carrier and tracking number and press **Mark as shipped**. The customer gets the
   "on its way" email with the tracking number automatically (untick the box if you do not want it sent).
5. **Delivered**: set **Delivered** once tracking shows delivery.
6. **Problems**: a delay → template B; damage → template D; a piece you cannot supply → tell the customer
   (template B) and refund. **Refunds are made only in the Stripe Dashboard** (Payments → the payment →
   Refund); the order turns **Refunded** by itself and the history shows it. You cannot mark an order paid or
   refunded by hand: only Stripe can.
7. Add **internal notes** in `/admin` for anything worth remembering (they are never shown to the customer).

Test orders (placed with a `sk_test_` key) are marked **TEST** in `/admin` and in the emails. Never ship them.

The customer can follow the order from the link in their email, on `/track-order` (order number + email) or in
their account. They see the status, the tracking number and the public history, never your internal notes.

Delivery times: the site states one headline, **"typically 7–15 business days" after dispatch** (`DELIVERY_TIME`),
plus a regional table of estimates (`DELIVERY_BY_REGION`). The regional values are still to be **CONFIRMED with
the carrier**. When they change, edit only `src/config/store.ts`; every page follows, and `npm run check:claims`
fails if a translation states a different headline range. Never promise a faster time than the site states.

## 2. Order numbers

Format: **`GTH-YYMM-NNNN`**, assigned automatically at checkout.

- `GTH` = Gethsemane (the sister store uses its own prefix, so records never mix).
- `YYMM` = year and month the order was placed (e.g. `2611` for November 2026).
- `NNNN` = running number within that month, starting at `0001`. Unpaid checkouts also use a number, so gaps
  are normal.

Use the number in every email, invoice, customs form and as the parcel label reference.

## 3. Stock check (after payment)

For every piece of a paid order:

- Is it physically in the workshop or the partner stock location? Which one ships it (affects delivery estimate
  and customs)?
- Every piece is handmade: grain, colour and size vary. If the piece differs noticeably from the photo (size,
  colour, a visible knot), email the customer a photo before shipping and offer a refund if they prefer.
- If something is not available: offer a similar piece with a photo, or a realistic making time. If the customer
  declines, refund it in Stripe. Never promise a date you cannot keep.

## 4. Coupons

Off by default. Create them in `/admin` → Coupons: percentage or fixed USD, optional minimum items total, expiry
date and usage limit. Disable a code there at any time. The discount is calculated on the server and shown on
Stripe's payment page; the redemption is counted only when the payment is confirmed.

## 5. Packing

- Wrap each piece separately in tissue, then bubble wrap; nativity figures individually.
- Crosses and thin pieces: add a stiff card so they cannot bend or snap.
- Double box for fragile or heavy orders; at least 3 cm of padding on every side; nothing should move when
  shaken.
- Inside the parcel: a printed packing list with the order number, the gift note if requested (no prices in
  gift orders), and a short care card (oil occasionally, keep out of direct heat, see the site's care page).
- Photograph the packed parcel before closing it (useful for damage claims).

## 6. Customs and shipping

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

## 7. Gift notes

- If the customer added a gift note at checkout, it is on the order in `/admin`. Copy it by hand or print it on a
  card; never include prices in a gift parcel.
- Gift wrap: CONFIRM whether it is offered and at what price before mentioning it to customers.
- If the parcel goes straight to the recipient, put the invoice in a separate envelope marked "for customs", or
  email it to the buyer only, if the carrier allows.

## 8. Record keeping

The database keeps every order with its items, prices, address, status history and your notes; Stripe keeps the
payments and refunds. For accounting, export payments from Stripe (Payments → Export) each month and keep them with
the invoices and customs forms. `docs/templates/orders.csv` and `refunds.csv` remain available if your accountant
wants a spreadsheet.

Keep records as long as tax law requires (CONFIRM the period, and set `DATA_RETENTION_YEARS` in
`src/config/store.ts` to match so the privacy page states it). When a customer deletes their account, paid orders
are kept without their phone number and gift note; unpaid orders are deleted.

Customer details are used only to fulfil the order and are shared only with the carrier. Never add customers to
mailing lists without their clear consent.

## 9. Templates

Files in `docs/templates/`:

- **`invoice.md`**: a separate invoice, when a customer or a customs form needs one.
- **`packing-list.md`**: printed and put inside every parcel.
- **`orders.csv`**, **`refunds.csv`**: optional spreadsheets.

## 10. Email templates

Automatic emails (account verification, password reset, order confirmation, "on its way") are sent by the site in
the customer's language. Use the templates below for everything you write yourself: reply from
`CONTACT_EMAIL`, in the customer's language (shown on the order in `/admin`), and replace the brackets. Keep the
tone calm, warm and honest, and never promise anything the site does not promise.

Sign-off (all languages; keep the handles exactly as written):

> — Gethsemane, Bethlehem · gethsemane.t12@gmail.com
> Instagram @gethsemane_t12 · TikTok @gethsemane.store · Facebook @gethsemane.t12

The five templates: **A** order confirmation (when the automatic email did not arrive), **B** delay,
**C** shipped (when you did not send the automatic email), **D** reply to a damage report, **E** refund made.

### English

**A.** Thank you for your order GTH-[…]. We have received your payment of [ ] USD and are preparing your pieces: [list]. Estimated delivery: [dates] after dispatch. You can follow your order here: [order link]. EU/UK customers can withdraw within 14 days of receiving the goods (see [your-domain]/en/withdrawal).

**B.** We are sorry: your order GTH-[…] will leave our workshop later than we said, around [date], because [reason]. If you would rather not wait, reply to this email and we will cancel the order and refund you in full.

**C.** Your order GTH-[…] is on its way with [carrier]. Tracking number: [number]. Estimated delivery: [dates]. Please keep the packaging until you have unpacked and checked everything.

**D.** We are very sorry your order GTH-[…] arrived damaged. Please send us photos of the piece, the box and the shipping label. We will send a replacement or refund you; you do not need to send the piece back.

**E.** We have refunded [ ] USD for your order GTH-[…] to the card you paid with. Depending on your bank, it can take 5–10 business days to appear. Thank you for your patience.

### Français

**A.** Merci pour votre commande GTH-[…]. Nous avons bien reçu votre paiement de [ ] USD et préparons vos pièces : [liste]. Livraison estimée : [dates] après l'expédition. Suivez votre commande ici : [lien]. Les clients de l'UE et du Royaume-Uni peuvent se rétracter dans les 14 jours suivant la réception (voir [votre-domaine]/fr/withdrawal).

**B.** Nous sommes désolés : votre commande GTH-[…] quittera notre atelier plus tard que prévu, vers le [date], car [raison]. Si vous préférez ne pas attendre, répondez à cet e-mail et nous annulerons la commande avec un remboursement intégral.

**C.** Votre commande GTH-[…] est en route avec [transporteur]. Numéro de suivi : [numéro]. Livraison estimée : [dates]. Merci de garder l'emballage jusqu'à ce que vous ayez tout déballé et vérifié.

**D.** Nous sommes vraiment désolés que votre commande GTH-[…] soit arrivée endommagée. Envoyez-nous des photos de la pièce, du carton et de l'étiquette d'expédition. Nous vous enverrons un remplacement ou vous rembourserons ; inutile de nous renvoyer la pièce.

**E.** Nous avons remboursé [ ] USD pour votre commande GTH-[…] sur la carte utilisée pour le paiement. Selon votre banque, le remboursement peut mettre 5 à 10 jours ouvrés à apparaître. Merci de votre patience.

### Español

**A.** Gracias por tu pedido GTH-[…]. Hemos recibido tu pago de [ ] USD y estamos preparando tus piezas: [lista]. Entrega estimada: [fechas] desde el envío. Sigue tu pedido aquí: [enlace]. Los clientes de la UE y del Reino Unido pueden desistir en los 14 días siguientes a la recepción (ver [tu-dominio]/es/withdrawal).

**B.** Lo sentimos: tu pedido GTH-[…] saldrá de nuestro taller más tarde de lo previsto, hacia el [fecha], porque [motivo]. Si prefieres no esperar, responde a este correo y cancelaremos el pedido con el reembolso completo.

**C.** Tu pedido GTH-[…] va de camino con [transportista]. Número de seguimiento: [número]. Entrega estimada: [fechas]. Guarda el embalaje hasta haber desembalado y revisado todo.

**D.** Sentimos mucho que tu pedido GTH-[…] llegara dañado. Envíanos fotos de la pieza, la caja y la etiqueta de envío. Te enviaremos una pieza nueva o te reembolsaremos; no hace falta que nos devuelvas la pieza.

**E.** Hemos reembolsado [ ] USD de tu pedido GTH-[…] en la tarjeta con la que pagaste. Según tu banco, puede tardar de 5 a 10 días hábiles en aparecer. Gracias por tu paciencia.

### Italiano

**A.** Grazie per il tuo ordine GTH-[…]. Abbiamo ricevuto il pagamento di [ ] USD e stiamo preparando i tuoi pezzi: [elenco]. Consegna stimata: [date] dalla spedizione. Segui l'ordine qui: [link]. I clienti di UE e Regno Unito possono recedere entro 14 giorni dal ricevimento (vedi [tuo-dominio]/it/withdrawal).

**B.** Ci dispiace: il tuo ordine GTH-[…] lascerà il laboratorio più tardi del previsto, intorno al [data], perché [motivo]. Se preferisci non aspettare, rispondi a questa email e annulleremo l'ordine con rimborso completo.

**C.** Il tuo ordine GTH-[…] è in viaggio con [corriere]. Numero di tracciamento: [numero]. Consegna stimata: [date]. Conserva l'imballaggio finché non hai disimballato e controllato tutto.

**D.** Ci dispiace molto che il tuo ordine GTH-[…] sia arrivato danneggiato. Inviaci foto del pezzo, della scatola e dell'etichetta di spedizione. Ti invieremo un sostituto o ti rimborseremo; non serve restituire il pezzo.

**E.** Abbiamo rimborsato [ ] USD per il tuo ordine GTH-[…] sulla carta usata per pagare. A seconda della banca, possono servire 5–10 giorni lavorativi perché compaia. Grazie per la pazienza.

### Deutsch

**A.** Vielen Dank für Ihre Bestellung GTH-[…]. Wir haben Ihre Zahlung über [ ] USD erhalten und bereiten Ihre Stücke vor: [Liste]. Voraussichtliche Lieferung: [Daten] nach Versand. Hier können Sie Ihre Bestellung verfolgen: [Link]. Kunden in der EU und im Vereinigten Königreich können binnen 14 Tagen nach Erhalt widerrufen (siehe [Ihre-Domain]/de/withdrawal).

**B.** Es tut uns leid: Ihre Bestellung GTH-[…] verlässt unsere Werkstatt später als angegeben, voraussichtlich am [Datum], weil [Grund]. Wenn Sie nicht warten möchten, antworten Sie auf diese E-Mail; wir stornieren die Bestellung und erstatten den vollen Betrag.

**C.** Ihre Bestellung GTH-[…] ist mit [Versanddienst] unterwegs. Sendungsnummer: [Nummer]. Voraussichtliche Lieferung: [Daten]. Bitte bewahren Sie die Verpackung auf, bis Sie alles ausgepackt und geprüft haben.

**D.** Es tut uns sehr leid, dass Ihre Bestellung GTH-[…] beschädigt angekommen ist. Bitte senden Sie uns Fotos des Stücks, des Kartons und des Versandetiketts. Wir schicken Ihnen Ersatz oder erstatten den Betrag; Sie müssen das Stück nicht zurücksenden.

**E.** Wir haben [ ] USD für Ihre Bestellung GTH-[…] auf die Karte erstattet, mit der Sie bezahlt haben. Je nach Bank kann es 5–10 Werktage dauern, bis die Gutschrift sichtbar ist. Vielen Dank für Ihre Geduld.

### Ελληνικά

**A.** Ευχαριστούμε για την παραγγελία GTH-[…]. Λάβαμε την πληρωμή σας [ ] USD και ετοιμάζουμε τα κομμάτια σας: [λίστα]. Εκτιμώμενη παράδοση: [ημερομηνίες] από την αποστολή. Παρακολουθήστε την παραγγελία εδώ: [σύνδεσμος]. Οι πελάτες σε ΕΕ και Ηνωμένο Βασίλειο μπορούν να υπαναχωρήσουν εντός 14 ημερών από την παραλαβή (βλ. [το-domain-σας]/el/withdrawal).

**B.** Λυπούμαστε: η παραγγελία σας GTH-[…] θα φύγει από το εργαστήριο αργότερα από ό,τι είπαμε, γύρω στις [ημερομηνία], επειδή [λόγος]. Αν προτιμάτε να μην περιμένετε, απαντήστε σε αυτό το email και θα ακυρώσουμε την παραγγελία με πλήρη επιστροφή χρημάτων.

**C.** Η παραγγελία σας GTH-[…] είναι καθ' οδόν με την [μεταφορική]. Αριθμός αποστολής: [αριθμός]. Εκτιμώμενη παράδοση: [ημερομηνίες]. Κρατήστε τη συσκευασία μέχρι να ανοίξετε και να ελέγξετε τα πάντα.

**D.** Λυπούμαστε πολύ που η παραγγελία σας GTH-[…] έφτασε κατεστραμμένη. Στείλτε μας φωτογραφίες του κομματιού, του κουτιού και της ετικέτας αποστολής. Θα σας στείλουμε αντικατάσταση ή θα σας επιστρέψουμε τα χρήματα· δεν χρειάζεται να επιστρέψετε το κομμάτι.

**E.** Επιστρέψαμε [ ] USD για την παραγγελία σας GTH-[…] στην κάρτα με την οποία πληρώσατε. Ανάλογα με την τράπεζα, μπορεί να χρειαστούν 5–10 εργάσιμες ημέρες για να εμφανιστεί. Ευχαριστούμε για την υπομονή σας.

### Polski

**A.** Dziękujemy za zamówienie GTH-[…]. Otrzymaliśmy płatność [ ] USD i przygotowujemy Twoje przedmioty: [lista]. Szacowana dostawa: [daty] od wysyłki. Śledź zamówienie tutaj: [link]. Klienci z UE i Wielkiej Brytanii mogą odstąpić od umowy w ciągu 14 dni od otrzymania towaru (zob. [twoja-domena]/pl/withdrawal).

**B.** Przepraszamy: zamówienie GTH-[…] wyjdzie z pracowni później, niż podaliśmy, około [data], ponieważ [powód]. Jeśli wolisz nie czekać, odpowiedz na tego e-maila, a anulujemy zamówienie i zwrócimy całą kwotę.

**C.** Twoje zamówienie GTH-[…] jest w drodze z [przewoźnik]. Numer przesyłki: [numer]. Szacowana dostawa: [daty]. Zachowaj opakowanie, dopóki wszystkiego nie rozpakujesz i nie sprawdzisz.

**D.** Bardzo nam przykro, że zamówienie GTH-[…] dotarło uszkodzone. Prześlij nam zdjęcia przedmiotu, kartonu i etykiety przewozowej. Wyślemy nowy przedmiot lub zwrócimy pieniądze; nie musisz odsyłać przedmiotu.

**E.** Zwróciliśmy [ ] USD za zamówienie GTH-[…] na kartę, którą zapłacono. W zależności od banku zwrot może być widoczny po 5–10 dniach roboczych. Dziękujemy za cierpliwość.

### Română

**A.** Mulțumim pentru comanda GTH-[…]. Am primit plata de [ ] USD și pregătim piesele: [listă]. Livrare estimată: [date] de la expediere. Urmărește comanda aici: [link]. Clienții din UE și Regatul Unit se pot retrage în 14 zile de la primire (vezi [domeniul-tău]/ro/withdrawal).

**B.** Ne pare rău: comanda GTH-[…] va pleca din atelier mai târziu decât am spus, în jurul datei de [dată], pentru că [motiv]. Dacă preferi să nu aștepți, răspunde la acest e-mail și anulăm comanda cu rambursare integrală.

**C.** Comanda ta GTH-[…] este pe drum cu [curier]. Număr de urmărire: [număr]. Livrare estimată: [date]. Păstrează ambalajul până ai despachetat și verificat totul.

**D.** Ne pare foarte rău că comanda GTH-[…] a ajuns deteriorată. Trimite-ne fotografii cu piesa, cutia și eticheta de expediere. Îți trimitem o piesă nouă sau îți rambursăm banii; nu trebuie să returnezi piesa.

**E.** Am rambursat [ ] USD pentru comanda GTH-[…] pe cardul cu care ai plătit. În funcție de bancă, suma poate apărea după 5–10 zile lucrătoare. Mulțumim pentru răbdare.

### Українська

**A.** Дякуємо за замовлення GTH-[…]. Ми отримали оплату [ ] USD і готуємо ваші вироби: [перелік]. Орієнтовна доставка: [дати] після відправлення. Стежте за замовленням тут: [посилання]. Клієнти з ЄС і Великої Британії можуть відмовитися протягом 14 днів після отримання (див. [ваш-домен]/uk/withdrawal).

**B.** Перепрошуємо: замовлення GTH-[…] вийде з майстерні пізніше, ніж ми повідомляли, орієнтовно [дата], тому що [причина]. Якщо не бажаєте чекати, дайте відповідь на цей лист, і ми скасуємо замовлення з повним поверненням коштів.

**C.** Ваше замовлення GTH-[…] уже в дорозі з [перевізник]. Номер для відстеження: [номер]. Орієнтовна доставка: [дати]. Збережіть упаковку, доки все не розпакуєте й не перевірите.

**D.** Нам дуже прикро, що замовлення GTH-[…] прибуло пошкодженим. Надішліть, будь ласка, фото виробу, коробки й транспортної етикетки. Ми надішлемо заміну або повернемо кошти; повертати виріб не потрібно.

**E.** Ми повернули [ ] USD за замовлення GTH-[…] на картку, якою ви платили. Залежно від банку кошти можуть відобразитися через 5–10 робочих днів. Дякуємо за терпіння.

### Português

**A.** Obrigado pela sua encomenda GTH-[…]. Recebemos o pagamento de [ ] USD e estamos a preparar as suas peças: [lista]. Entrega estimada: [datas] após a expedição. Acompanhe a encomenda aqui: [link]. Os clientes da UE e do Reino Unido podem resolver o contrato no prazo de 14 dias após a receção (ver [o-seu-domínio]/pt/withdrawal).

**B.** Lamentamos: a sua encomenda GTH-[…] sairá da oficina mais tarde do que indicámos, por volta de [data], porque [motivo]. Se preferir não esperar, responda a este e-mail e cancelamos a encomenda com reembolso total.

**C.** A sua encomenda GTH-[…] está a caminho com [transportadora]. Número de seguimento: [número]. Entrega estimada: [datas]. Guarde a embalagem até ter desembalado e verificado tudo.

**D.** Lamentamos muito que a sua encomenda GTH-[…] tenha chegado danificada. Envie-nos fotografias da peça, da caixa e da etiqueta de envio. Enviaremos uma peça nova ou faremos o reembolso; não precisa de devolver a peça.

**E.** Reembolsámos [ ] USD da sua encomenda GTH-[…] no cartão com que pagou. Consoante o banco, pode demorar 5 a 10 dias úteis a aparecer. Obrigado pela paciência.
