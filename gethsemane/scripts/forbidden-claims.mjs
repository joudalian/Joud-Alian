// Claims the store must never make (it cannot back them up). Used by scripts/check-claims.mjs (messages, product
// data, config) and by the page crawl in tests/links.spec.ts.
// Each entry: a label and a case-insensitive pattern covering the claim in all ten languages.
export const forbiddenClaims = [
  ["SSL / 256-bit", /\bSSL\b|256[-\s]?bit/i],
  ["payment providers and card brands", /\b(stripe|paypal|apple\s?pay|google\s?pay|visa|mastercard|american express|amex|klarna)\b/i],
  ["secure checkout", /secure checkout|paiement sécurisé|pago seguro|pagamento (sicuro|seguro)|sicher(e|er) (zahlung|kasse|checkout)|ασφαλής πληρωμή|bezpieczn\S* płatno|plat[ăa] securizat|безпечн\S* оплат/i],
  ["data never stored", /data (is )?never stored|never store your (card|data)/i],
  ["insured shipping", /\binsured\b|\bassuré[es]?\b|\basegurad[oa]s?\b|\bassicurat[oia]\b|\bversichert\b|ασφαλισμέν|ubezpieczon|\basigurat[ăe]?\b|застрахован|\bsegurad[oa]s?\b/i],
  ["24/7", /24\s?\/\s?7/],
  ["fair trade", /fair[-\s]?trade|commerce équitable|comercio justo|commercio equo|fairer handel|δίκαιο εμπόριο|sprawiedliw\S* handl|comerț echitabil|справедлив\S* торгівл|comércio justo/i],
  ["Christian artisans", /christian artisans|artisans chrétiens|artesanos cristianos|artigiani cristiani|christliche handwerker|χριστιανοί τεχνίτες|chrześcijańscy rzemieślnicy|meșteri creștini|християнськ\S* майстр|artesãos cristãos/i],
  ["since 1999", /(since|depuis|desde|dal|seit|από το|od|din|з) 1999/i],
  ["family-owned", /family[-\s]?owned|entreprise familiale|empresa familiar|azienda di famiglia|familienbetrieb|οικογενειακή επιχείρηση|firma rodzinna|afacere de familie|сімейн\S* бізнес/i],
  ["passed down through generations", /passed down|through generations|for generations|de génération en génération|depuis des générations|de generación en generación|di generazione in generazione|da generazioni|von generation zu generation|seit generationen|από γενιά σε γενιά|εδώ και γενιές|z pokolenia na pokolenie|od pokoleń|din generație în generație|de generații|з покоління в покоління|поколіннями|de geração em geração|há gerações/i],
  ["blessed (items)", /\bblessed\b|\bbéni(e|s|es)?\b|\bbendecid[oa]s?\b|\bbenedett[oia]\b|\bgesegnet\b|ευλογημέν|pobłogosławion|binecuvântat|освячен(ий|а|е|і|их|ого)(?![а-яіїєґ])|благословенн(ий|а|е|і|их|ого)(?![а-яіїєґ])|abençoad[oa]s?/i],
  ["100% untreated", /untreated|non traité|sin tratar|non trattat|unbehandelt|ανεπεξέργαστ|netratat|необроблен|não tratad/i],
  ["air-dried for months", /air[-\s]?dried|séché à l'air|secad[oa] al aire|essiccat[oa] all'aria|luftgetrocknet|στεγνωμέν\S* στον αέρα|suszon\S* na powietrzu|uscat\S* la aer|висушен\S* на повітрі|sec[oa] ao ar/i],
  ["never cut", /never cut|jamais coupé|nunca cortad|mai tagliat|nie geschnitten|ποτέ κομμέν|nigdy nie cię|niciodată tăiat|ніколи не зрізан/i],
  [
    "never felled",
    /(never|not) (been )?felled|jamais abattu|pas abattu|nunca talad|no talad|mai abbattut|non abbattut|nie gefällt|nicht gefällt|ποτέ δεν κόπηκ|δεν κόβ|ποτέ δεν υλοτομ|χωρίς υλοτομ|όχι από υλοτομ|nigdy nie ści|nie ścina|niciodată tăiat|niciodată doborât|nu sunt tăiaț|ніколи не зруб|не зрубан|nunca abatid|não abatid/i,
  ],
  ["free shipping", /free (shipping|delivery)|livraison gratuite|envío gratis|envío gratuito|spedizione gratuita|kostenlos\S* versand|versandkostenfrei|δωρεάν αποστολή|darmow\S* (dostaw|wysyłk)|livrare gratuită|безкоштовн\S* доставк|portes grátis|envio gratuito/i],
  ["star ratings", /[★☆]|\b\d(\.\d)?\s?(\/\s?5|out of 5)\b|\b(5|five)[-\s]star/i],
];

/** Returns the labels of every forbidden claim found in `text`. */
export function findClaims(text) {
  return forbiddenClaims.filter(([, re]) => re.test(text)).map(([label]) => label);
}
