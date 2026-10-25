/**
 * CATEGORIES — data only. Adding a category means adding an entry here (and, optionally, its banner image);
 * no code changes. Products refer to categories by slug (src/data/products.ts → categories).
 *
 *   slug         English URL name, lowercase letters, numbers and dashes (/fr/shop/<slug>)
 *   order        position in menus and lists (lowest first)
 *   image        optional banner in /public; defaults to /images/categories/<slug>.webp (`npm run assets`
 *                creates a neutral card when the file is missing)
 *   gifts        optional home-page gift ideas this category is linked from: "christmas" | "faith" | "home" | "far"
 *   text         { en: { name, description }, … } — English required; missing languages show English
 *   needsReview  optional languages whose text still needs a native check
 */
import type { CategoryInput } from "./catalog-schema";

export const categories: CategoryInput[] = [
  {
    slug: "nativity",
    order: 10,
    gifts: ["christmas"],
    text: {
      en: { name: "Nativity", description: "Nativity sets and Holy Family figures to gather around at Christmas and all year." },
      fr: { name: "Crèches", description: "Crèches et figurines de la Sainte Famille, pour Noël et toute l'année." },
      es: { name: "Belenes", description: "Belenes y figuras de la Sagrada Familia para Navidad y todo el año." },
      it: { name: "Presepi", description: "Presepi e statuine della Sacra Famiglia per Natale e per tutto l'anno." },
      de: { name: "Krippen", description: "Weihnachtskrippen und Figuren der Heiligen Familie für Weihnachten und das ganze Jahr." },
      el: { name: "Φάτνες", description: "Φάτνες και μορφές της Αγίας Οικογένειας για τα Χριστούγεννα και όλο τον χρόνο." },
      pl: { name: "Szopki", description: "Szopki i figurki Świętej Rodziny na Boże Narodzenie i na cały rok." },
      ro: { name: "Iesle", description: "Iesle și figurine ale Sfintei Familii pentru Crăciun și pentru tot anul." },
      uk: { name: "Вертепи", description: "Вертепи та фігурки Святого Сімейства на Різдво й на весь рік." },
      pt: { name: "Presépios", description: "Presépios e figuras da Sagrada Família para o Natal e para todo o ano." },
    },
  },
  {
    slug: "crosses",
    order: 20,
    gifts: ["faith", "far"],
    text: {
      en: { name: "Crosses", description: "Wall crosses, Jerusalem crosses and small holding crosses for prayer." },
      fr: { name: "Croix", description: "Croix murales, croix de Jérusalem et petites croix de prière à tenir en main." },
      es: { name: "Cruces", description: "Cruces de pared, cruces de Jerusalén y pequeñas cruces para sostener al rezar." },
      it: { name: "Croci", description: "Croci da parete, croci di Gerusalemme e piccole croci da tenere in mano durante la preghiera." },
      de: { name: "Kreuze", description: "Wandkreuze, Jerusalemkreuze und kleine Handkreuze für das Gebet." },
      el: { name: "Σταυροί", description: "Σταυροί τοίχου, σταυροί Ιερουσαλήμ και μικροί σταυροί χεριού για την προσευχή." },
      pl: { name: "Krzyże", description: "Krzyże ścienne, krzyże jerozolimskie i małe krzyżyki do trzymania w dłoni podczas modlitwy." },
      ro: { name: "Cruci", description: "Cruci de perete, cruci de Ierusalim și cruciulițe de ținut în mână la rugăciune." },
      uk: { name: "Хрести", description: "Настінні хрести, єрусалимські хрести та маленькі хрести для молитви в долоні." },
      pt: { name: "Cruzes", description: "Cruzes de parede, cruzes de Jerusalém e pequenas cruzes para segurar durante a oração." },
    },
  },
  {
    slug: "rosaries",
    order: 30,
    gifts: ["faith"],
    text: {
      en: { name: "Rosaries", description: "Rosaries, chaplets and prayer beads strung with olive wood beads." },
      fr: { name: "Chapelets", description: "Chapelets, dizainiers et chapelets de prière en perles de bois d'olivier." },
      es: { name: "Rosarios", description: "Rosarios, decenarios y cuentas de oración de madera de olivo." },
      it: { name: "Rosari", description: "Rosari, decine e coroncine di preghiera con grani in legno d'ulivo." },
      de: { name: "Rosenkränze", description: "Rosenkränze, Zehner und Gebetsketten mit Perlen aus Olivenholz." },
      el: { name: "Κομποσχοίνια", description: "Κομποσχοίνια, ροζάρια και χάντρες προσευχής από ελιόξυλο." },
      pl: { name: "Różańce", description: "Różańce, dziesiątki i sznury modlitewne z koralikami z drewna oliwnego." },
      ro: { name: "Rozarii", description: "Rozarii, decade și metănii cu mărgele din lemn de măslin." },
      uk: { name: "Вервиці", description: "Вервиці, десятки та молитовні намистини з оливкового дерева." },
      pt: { name: "Terços", description: "Terços, dezenas e contas de oração em madeira de oliveira." },
    },
  },
  {
    slug: "home",
    order: 40,
    gifts: ["home"],
    text: {
      en: { name: "Home decor", description: "Bowls, boards and candle holders that bring olive wood to the table." },
      fr: { name: "Décoration", description: "Saladiers, planches et bougeoirs qui apportent le bois d'olivier à table." },
      es: { name: "Decoración", description: "Cuencos, tablas y candelabros que llevan la madera de olivo a la mesa." },
      it: { name: "Decorazione", description: "Ciotole, taglieri e portacandele che portano il legno d'ulivo in tavola." },
      de: { name: "Wohndeko", description: "Schalen, Bretter und Kerzenhalter, die Olivenholz auf den Tisch bringen." },
      el: { name: "Διακόσμηση", description: "Μπολ, ξύλα σερβιρίσματος και κηροπήγια που φέρνουν το ελιόξυλο στο τραπέζι." },
      pl: { name: "Dekoracje", description: "Miski, deski i świeczniki, które wnoszą drewno oliwne na stół." },
      ro: { name: "Decorațiuni", description: "Boluri, platouri și sfeșnice care aduc lemnul de măslin pe masă." },
      uk: { name: "Декор", description: "Миски, дошки та свічники, що приносять оливкове дерево на стіл." },
      pt: { name: "Decoração", description: "Taças, tábuas e castiçais que levam a madeira de oliveira para a mesa." },
    },
  },
];
