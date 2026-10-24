/**
 * PRODUCT CATALOG — the one file to edit when adding, changing or removing products.
 *
 * Each product has:
 *   id        unique number (never reuse an id)
 *   slug      unique URL name: lowercase letters, numbers and dashes (/en/product/<slug>)
 *   category  one of: "nativity", "crosses", "rosaries", "home"
 *   priceUsd  price in US dollars; other currencies are converted with the rates in src/lib/currency.ts
 *   image     path of the photo inside /public (portrait 4:5 recommended, e.g. 1200×1500 .webp or .jpg)
 *   featured  optional: true shows the product on the home page
 *   text      name and description in all 10 languages (every language is required)
 *
 * See "Editing products" in README.md. `npm run check:i18n` validates this file.
 * Names and descriptions below are placeholders.
 */
import type { Locale } from "../i18n/locales";

export const categorySlugs = ["nativity", "crosses", "rosaries", "home"] as const;
export type CategorySlug = (typeof categorySlugs)[number];

export type ProductText = { name: string; description: string };

export type ProductRecord = {
  id: number;
  slug: string;
  category: CategorySlug;
  priceUsd: number;
  image: string;
  featured?: boolean;
  text: Record<Locale, ProductText>;
};

export const products = [
  {
    id: 1,
    slug: "nativity-set-classic",
    category: "nativity",
    priceUsd: 89,
    image: "/images/products/nativity-set-classic.webp",
    featured: true,
    text: {
      en: {
        name: "Classic Nativity Set",
        description: "Placeholder description. A short paragraph about this hand-carved olive wood piece from Bethlehem will be added here soon.",
      },
      fr: {
        name: "Crèche classique",
        description: "Description provisoire. Un court paragraphe sur cette pièce en bois d'olivier sculptée à la main à Bethléem sera ajouté ici prochainement.",
      },
      es: {
        name: "Belén clásico",
        description: "Descripción provisional. Pronto añadiremos aquí un breve párrafo sobre esta pieza de madera de olivo tallada a mano en Belén.",
      },
      it: {
        name: "Presepe classico",
        description: "Descrizione provvisoria. A breve aggiungeremo qui un breve paragrafo su questo pezzo in legno d'ulivo intagliato a mano a Betlemme.",
      },
      de: {
        name: "Klassische Weihnachtskrippe",
        description: "Platzhaltertext. Hier folgt bald ein kurzer Absatz über dieses in Bethlehem von Hand geschnitzte Stück aus Olivenholz.",
      },
      el: {
        name: "Κλασική φάτνη",
        description: "Προσωρινή περιγραφή. Σύντομα θα προστεθεί εδώ μια μικρή παράγραφος για αυτό το χειροποίητο κομμάτι από ελιόξυλο της Βηθλεέμ.",
      },
      pl: {
        name: "Klasyczna szopka",
        description: "Opis tymczasowy. Wkrótce dodamy tu krótki akapit o tym ręcznie rzeźbionym w Betlejem przedmiocie z drewna oliwnego.",
      },
      ro: {
        name: "Iesle clasică",
        description: "Descriere provizorie. În curând vom adăuga aici un scurt paragraf despre această piesă din lemn de măslin sculptată manual în Betleem.",
      },
      uk: {
        name: "Класичний вертеп",
        description: "Тимчасовий опис. Незабаром тут з'явиться короткий абзац про цей виріб з оливкового дерева ручної різьби з Вифлеєма.",
      },
      pt: {
        name: "Presépio clássico",
        description: "Descrição provisória. Em breve acrescentaremos aqui um pequeno parágrafo sobre esta peça em madeira de oliveira esculpida à mão em Belém.",
      },
    },
  },
  {
    id: 2,
    slug: "nativity-stable-grand",
    category: "nativity",
    priceUsd: 189,
    image: "/images/products/nativity-stable-grand.webp",
    text: {
      en: {
        name: "Grand Nativity Stable",
        description: "Placeholder description. A short paragraph about this hand-carved olive wood piece from Bethlehem will be added here soon.",
      },
      fr: {
        name: "Grande étable de la Nativité",
        description: "Description provisoire. Un court paragraphe sur cette pièce en bois d'olivier sculptée à la main à Bethléem sera ajouté ici prochainement.",
      },
      es: {
        name: "Gran portal de Belén",
        description: "Descripción provisional. Pronto añadiremos aquí un breve párrafo sobre esta pieza de madera de olivo tallada a mano en Belén.",
      },
      it: {
        name: "Grande capanna della Natività",
        description: "Descrizione provvisoria. A breve aggiungeremo qui un breve paragrafo su questo pezzo in legno d'ulivo intagliato a mano a Betlemme.",
      },
      de: {
        name: "Großer Krippenstall",
        description: "Platzhaltertext. Hier folgt bald ein kurzer Absatz über dieses in Bethlehem von Hand geschnitzte Stück aus Olivenholz.",
      },
      el: {
        name: "Μεγάλος στάβλος της Γέννησης",
        description: "Προσωρινή περιγραφή. Σύντομα θα προστεθεί εδώ μια μικρή παράγραφος για αυτό το χειροποίητο κομμάτι από ελιόξυλο της Βηθλεέμ.",
      },
      pl: {
        name: "Duża stajenka betlejemska",
        description: "Opis tymczasowy. Wkrótce dodamy tu krótki akapit o tym ręcznie rzeźbionym w Betlejem przedmiocie z drewna oliwnego.",
      },
      ro: {
        name: "Iesle mare cu staul",
        description: "Descriere provizorie. În curând vom adăuga aici un scurt paragraf despre această piesă din lemn de măslin sculptată manual în Betleem.",
      },
      uk: {
        name: "Великий різдвяний вертеп",
        description: "Тимчасовий опис. Незабаром тут з'явиться короткий абзац про цей виріб з оливкового дерева ручної різьби з Вифлеєма.",
      },
      pt: {
        name: "Grande estábulo do presépio",
        description: "Descrição provisória. Em breve acrescentaremos aqui um pequeno parágrafo sobre esta peça em madeira de oliveira esculpida à mão em Belém.",
      },
    },
  },
  {
    id: 3,
    slug: "holy-family-figurine",
    category: "nativity",
    priceUsd: 54,
    image: "/images/products/holy-family-figurine.webp",
    text: {
      en: {
        name: "Holy Family Figurine",
        description: "Placeholder description. A short paragraph about this hand-carved olive wood piece from Bethlehem will be added here soon.",
      },
      fr: {
        name: "Figurine de la Sainte Famille",
        description: "Description provisoire. Un court paragraphe sur cette pièce en bois d'olivier sculptée à la main à Bethléem sera ajouté ici prochainement.",
      },
      es: {
        name: "Figura de la Sagrada Familia",
        description: "Descripción provisional. Pronto añadiremos aquí un breve párrafo sobre esta pieza de madera de olivo tallada a mano en Belén.",
      },
      it: {
        name: "Statuina della Sacra Famiglia",
        description: "Descrizione provvisoria. A breve aggiungeremo qui un breve paragrafo su questo pezzo in legno d'ulivo intagliato a mano a Betlemme.",
      },
      de: {
        name: "Figur der Heiligen Familie",
        description: "Platzhaltertext. Hier folgt bald ein kurzer Absatz über dieses in Bethlehem von Hand geschnitzte Stück aus Olivenholz.",
      },
      el: {
        name: "Αγία Οικογένεια",
        description: "Προσωρινή περιγραφή. Σύντομα θα προστεθεί εδώ μια μικρή παράγραφος για αυτό το χειροποίητο κομμάτι από ελιόξυλο της Βηθλεέμ.",
      },
      pl: {
        name: "Figurka Świętej Rodziny",
        description: "Opis tymczasowy. Wkrótce dodamy tu krótki akapit o tym ręcznie rzeźbionym w Betlejem przedmiocie z drewna oliwnego.",
      },
      ro: {
        name: "Figurină Sfânta Familie",
        description: "Descriere provizorie. În curând vom adăuga aici un scurt paragraf despre această piesă din lemn de măslin sculptată manual în Betleem.",
      },
      uk: {
        name: "Фігурка Святого Сімейства",
        description: "Тимчасовий опис. Незабаром тут з'явиться короткий абзац про цей виріб з оливкового дерева ручної різьби з Вифлеєма.",
      },
      pt: {
        name: "Figura da Sagrada Família",
        description: "Descrição provisória. Em breve acrescentaremos aqui um pequeno parágrafo sobre esta peça em madeira de oliveira esculpida à mão em Belém.",
      },
    },
  },
  {
    id: 4,
    slug: "jerusalem-cross",
    category: "crosses",
    priceUsd: 39,
    image: "/images/products/jerusalem-cross.webp",
    featured: true,
    text: {
      en: {
        name: "Jerusalem Cross",
        description: "Placeholder description. A short paragraph about this hand-carved olive wood piece from Bethlehem will be added here soon.",
      },
      fr: {
        name: "Croix de Jérusalem",
        description: "Description provisoire. Un court paragraphe sur cette pièce en bois d'olivier sculptée à la main à Bethléem sera ajouté ici prochainement.",
      },
      es: {
        name: "Cruz de Jerusalén",
        description: "Descripción provisional. Pronto añadiremos aquí un breve párrafo sobre esta pieza de madera de olivo tallada a mano en Belén.",
      },
      it: {
        name: "Croce di Gerusalemme",
        description: "Descrizione provvisoria. A breve aggiungeremo qui un breve paragrafo su questo pezzo in legno d'ulivo intagliato a mano a Betlemme.",
      },
      de: {
        name: "Jerusalemkreuz",
        description: "Platzhaltertext. Hier folgt bald ein kurzer Absatz über dieses in Bethlehem von Hand geschnitzte Stück aus Olivenholz.",
      },
      el: {
        name: "Σταυρός Ιερουσαλήμ",
        description: "Προσωρινή περιγραφή. Σύντομα θα προστεθεί εδώ μια μικρή παράγραφος για αυτό το χειροποίητο κομμάτι από ελιόξυλο της Βηθλεέμ.",
      },
      pl: {
        name: "Krzyż jerozolimski",
        description: "Opis tymczasowy. Wkrótce dodamy tu krótki akapit o tym ręcznie rzeźbionym w Betlejem przedmiocie z drewna oliwnego.",
      },
      ro: {
        name: "Cruce de Ierusalim",
        description: "Descriere provizorie. În curând vom adăuga aici un scurt paragraf despre această piesă din lemn de măslin sculptată manual în Betleem.",
      },
      uk: {
        name: "Єрусалимський хрест",
        description: "Тимчасовий опис. Незабаром тут з'явиться короткий абзац про цей виріб з оливкового дерева ручної різьби з Вифлеєма.",
      },
      pt: {
        name: "Cruz de Jerusalém",
        description: "Descrição provisória. Em breve acrescentaremos aqui um pequeno parágrafo sobre esta peça em madeira de oliveira esculpida à mão em Belém.",
      },
    },
  },
  {
    id: 5,
    slug: "wall-cross-carved",
    category: "crosses",
    priceUsd: 45,
    image: "/images/products/wall-cross-carved.webp",
    text: {
      en: {
        name: "Carved Wall Cross",
        description: "Placeholder description. A short paragraph about this hand-carved olive wood piece from Bethlehem will be added here soon.",
      },
      fr: {
        name: "Croix murale sculptée",
        description: "Description provisoire. Un court paragraphe sur cette pièce en bois d'olivier sculptée à la main à Bethléem sera ajouté ici prochainement.",
      },
      es: {
        name: "Cruz de pared tallada",
        description: "Descripción provisional. Pronto añadiremos aquí un breve párrafo sobre esta pieza de madera de olivo tallada a mano en Belén.",
      },
      it: {
        name: "Croce da parete intagliata",
        description: "Descrizione provvisoria. A breve aggiungeremo qui un breve paragrafo su questo pezzo in legno d'ulivo intagliato a mano a Betlemme.",
      },
      de: {
        name: "Geschnitztes Wandkreuz",
        description: "Platzhaltertext. Hier folgt bald ein kurzer Absatz über dieses in Bethlehem von Hand geschnitzte Stück aus Olivenholz.",
      },
      el: {
        name: "Σκαλιστός σταυρός τοίχου",
        description: "Προσωρινή περιγραφή. Σύντομα θα προστεθεί εδώ μια μικρή παράγραφος για αυτό το χειροποίητο κομμάτι από ελιόξυλο της Βηθλεέμ.",
      },
      pl: {
        name: "Rzeźbiony krzyż ścienny",
        description: "Opis tymczasowy. Wkrótce dodamy tu krótki akapit o tym ręcznie rzeźbionym w Betlejem przedmiocie z drewna oliwnego.",
      },
      ro: {
        name: "Cruce de perete sculptată",
        description: "Descriere provizorie. În curând vom adăuga aici un scurt paragraf despre această piesă din lemn de măslin sculptată manual în Betleem.",
      },
      uk: {
        name: "Різьблений настінний хрест",
        description: "Тимчасовий опис. Незабаром тут з'явиться короткий абзац про цей виріб з оливкового дерева ручної різьби з Вифлеєма.",
      },
      pt: {
        name: "Cruz de parede esculpida",
        description: "Descrição provisória. Em breve acrescentaremos aqui um pequeno parágrafo sobre esta peça em madeira de oliveira esculpida à mão em Belém.",
      },
    },
  },
  {
    id: 6,
    slug: "pocket-holding-cross",
    category: "crosses",
    priceUsd: 14,
    image: "/images/products/pocket-holding-cross.webp",
    text: {
      en: {
        name: "Pocket Holding Cross",
        description: "Placeholder description. A short paragraph about this hand-carved olive wood piece from Bethlehem will be added here soon.",
      },
      fr: {
        name: "Croix de poche",
        description: "Description provisoire. Un court paragraphe sur cette pièce en bois d'olivier sculptée à la main à Bethléem sera ajouté ici prochainement.",
      },
      es: {
        name: "Cruz de bolsillo",
        description: "Descripción provisional. Pronto añadiremos aquí un breve párrafo sobre esta pieza de madera de olivo tallada a mano en Belén.",
      },
      it: {
        name: "Croce tascabile",
        description: "Descrizione provvisoria. A breve aggiungeremo qui un breve paragrafo su questo pezzo in legno d'ulivo intagliato a mano a Betlemme.",
      },
      de: {
        name: "Handschmeichler-Kreuz",
        description: "Platzhaltertext. Hier folgt bald ein kurzer Absatz über dieses in Bethlehem von Hand geschnitzte Stück aus Olivenholz.",
      },
      el: {
        name: "Σταυρός τσέπης",
        description: "Προσωρινή περιγραφή. Σύντομα θα προστεθεί εδώ μια μικρή παράγραφος για αυτό το χειροποίητο κομμάτι από ελιόξυλο της Βηθλεέμ.",
      },
      pl: {
        name: "Krzyżyk do dłoni",
        description: "Opis tymczasowy. Wkrótce dodamy tu krótki akapit o tym ręcznie rzeźbionym w Betlejem przedmiocie z drewna oliwnego.",
      },
      ro: {
        name: "Cruciuliță de buzunar",
        description: "Descriere provizorie. În curând vom adăuga aici un scurt paragraf despre această piesă din lemn de măslin sculptată manual în Betleem.",
      },
      uk: {
        name: "Кишеньковий хрестик",
        description: "Тимчасовий опис. Незабаром тут з'явиться короткий абзац про цей виріб з оливкового дерева ручної різьби з Вифлеєма.",
      },
      pt: {
        name: "Cruz de bolso",
        description: "Descrição provisória. Em breve acrescentaremos aqui um pequeno parágrafo sobre esta peça em madeira de oliveira esculpida à mão em Belém.",
      },
    },
  },
  {
    id: 7,
    slug: "rosary-olive-wood",
    category: "rosaries",
    priceUsd: 24,
    image: "/images/products/rosary-olive-wood.webp",
    featured: true,
    text: {
      en: {
        name: "Olive Wood Rosary",
        description: "Placeholder description. A short paragraph about this hand-carved olive wood piece from Bethlehem will be added here soon.",
      },
      fr: {
        name: "Chapelet en bois d'olivier",
        description: "Description provisoire. Un court paragraphe sur cette pièce en bois d'olivier sculptée à la main à Bethléem sera ajouté ici prochainement.",
      },
      es: {
        name: "Rosario de madera de olivo",
        description: "Descripción provisional. Pronto añadiremos aquí un breve párrafo sobre esta pieza de madera de olivo tallada a mano en Belén.",
      },
      it: {
        name: "Rosario in legno d'ulivo",
        description: "Descrizione provvisoria. A breve aggiungeremo qui un breve paragrafo su questo pezzo in legno d'ulivo intagliato a mano a Betlemme.",
      },
      de: {
        name: "Rosenkranz aus Olivenholz",
        description: "Platzhaltertext. Hier folgt bald ein kurzer Absatz über dieses in Bethlehem von Hand geschnitzte Stück aus Olivenholz.",
      },
      el: {
        name: "Ροζάριο από ελιόξυλο",
        description: "Προσωρινή περιγραφή. Σύντομα θα προστεθεί εδώ μια μικρή παράγραφος για αυτό το χειροποίητο κομμάτι από ελιόξυλο της Βηθλεέμ.",
      },
      pl: {
        name: "Różaniec z drewna oliwnego",
        description: "Opis tymczasowy. Wkrótce dodamy tu krótki akapit o tym ręcznie rzeźbionym w Betlejem przedmiocie z drewna oliwnego.",
      },
      ro: {
        name: "Rozariu din lemn de măslin",
        description: "Descriere provizorie. În curând vom adăuga aici un scurt paragraf despre această piesă din lemn de măslin sculptată manual în Betleem.",
      },
      uk: {
        name: "Вервиця з оливкового дерева",
        description: "Тимчасовий опис. Незабаром тут з'явиться короткий абзац про цей виріб з оливкового дерева ручної різьби з Вифлеєма.",
      },
      pt: {
        name: "Terço em madeira de oliveira",
        description: "Descrição provisória. Em breve acrescentaremos aqui um pequeno parágrafo sobre esta peça em madeira de oliveira esculpida à mão em Belém.",
      },
    },
  },
  {
    id: 8,
    slug: "chaplet-bracelet",
    category: "rosaries",
    priceUsd: 16,
    image: "/images/products/chaplet-bracelet.webp",
    text: {
      en: {
        name: "Chaplet Bracelet",
        description: "Placeholder description. A short paragraph about this hand-carved olive wood piece from Bethlehem will be added here soon.",
      },
      fr: {
        name: "Bracelet dizainier",
        description: "Description provisoire. Un court paragraphe sur cette pièce en bois d'olivier sculptée à la main à Bethléem sera ajouté ici prochainement.",
      },
      es: {
        name: "Pulsera decenario",
        description: "Descripción provisional. Pronto añadiremos aquí un breve párrafo sobre esta pieza de madera de olivo tallada a mano en Belén.",
      },
      it: {
        name: "Bracciale decina",
        description: "Descrizione provvisoria. A breve aggiungeremo qui un breve paragrafo su questo pezzo in legno d'ulivo intagliato a mano a Betlemme.",
      },
      de: {
        name: "Zehner-Armband",
        description: "Platzhaltertext. Hier folgt bald ein kurzer Absatz über dieses in Bethlehem von Hand geschnitzte Stück aus Olivenholz.",
      },
      el: {
        name: "Βραχιόλι προσευχής",
        description: "Προσωρινή περιγραφή. Σύντομα θα προστεθεί εδώ μια μικρή παράγραφος για αυτό το χειροποίητο κομμάτι από ελιόξυλο της Βηθλεέμ.",
      },
      pl: {
        name: "Bransoletka dziesiątka",
        description: "Opis tymczasowy. Wkrótce dodamy tu krótki akapit o tym ręcznie rzeźbionym w Betlejem przedmiocie z drewna oliwnego.",
      },
      ro: {
        name: "Brățară decadă",
        description: "Descriere provizorie. În curând vom adăuga aici un scurt paragraf despre această piesă din lemn de măslin sculptată manual în Betleem.",
      },
      uk: {
        name: "Браслет-десяток",
        description: "Тимчасовий опис. Незабаром тут з'явиться короткий абзац про цей виріб з оливкового дерева ручної різьби з Вифлеєма.",
      },
      pt: {
        name: "Pulseira dezena",
        description: "Descrição provisória. Em breve acrescentaremos aqui um pequeno parágrafo sobre esta peça em madeira de oliveira esculpida à mão em Belém.",
      },
    },
  },
  {
    id: 9,
    slug: "prayer-beads-33",
    category: "rosaries",
    priceUsd: 19,
    image: "/images/products/prayer-beads-33.webp",
    text: {
      en: {
        name: "33 Prayer Beads",
        description: "Placeholder description. A short paragraph about this hand-carved olive wood piece from Bethlehem will be added here soon.",
      },
      fr: {
        name: "Chapelet de 33 perles",
        description: "Description provisoire. Un court paragraphe sur cette pièce en bois d'olivier sculptée à la main à Bethléem sera ajouté ici prochainement.",
      },
      es: {
        name: "Cuentas de oración de 33",
        description: "Descripción provisional. Pronto añadiremos aquí un breve párrafo sobre esta pieza de madera de olivo tallada a mano en Belén.",
      },
      it: {
        name: "Coroncina di 33 grani",
        description: "Descrizione provvisoria. A breve aggiungeremo qui un breve paragrafo su questo pezzo in legno d'ulivo intagliato a mano a Betlemme.",
      },
      de: {
        name: "Gebetskette mit 33 Perlen",
        description: "Platzhaltertext. Hier folgt bald ein kurzer Absatz über dieses in Bethlehem von Hand geschnitzte Stück aus Olivenholz.",
      },
      el: {
        name: "Κομποσχοίνι 33 χαντρών",
        description: "Προσωρινή περιγραφή. Σύντομα θα προστεθεί εδώ μια μικρή παράγραφος για αυτό το χειροποίητο κομμάτι από ελιόξυλο της Βηθλεέμ.",
      },
      pl: {
        name: "Sznur modlitewny 33 koraliki",
        description: "Opis tymczasowy. Wkrótce dodamy tu krótki akapit o tym ręcznie rzeźbionym w Betlejem przedmiocie z drewna oliwnego.",
      },
      ro: {
        name: "Metanii cu 33 de mărgele",
        description: "Descriere provizorie. În curând vom adăuga aici un scurt paragraf despre această piesă din lemn de măslin sculptată manual în Betleem.",
      },
      uk: {
        name: "Чотки на 33 намистини",
        description: "Тимчасовий опис. Незабаром тут з'явиться короткий абзац про цей виріб з оливкового дерева ручної різьби з Вифлеєма.",
      },
      pt: {
        name: "Contas de oração de 33",
        description: "Descrição provisória. Em breve acrescentaremos aqui um pequeno parágrafo sobre esta peça em madeira de oliveira esculpida à mão em Belém.",
      },
    },
  },
  {
    id: 10,
    slug: "salad-bowl",
    category: "home",
    priceUsd: 69,
    image: "/images/products/salad-bowl.webp",
    featured: true,
    text: {
      en: {
        name: "Salad Bowl",
        description: "Placeholder description. A short paragraph about this hand-carved olive wood piece from Bethlehem will be added here soon.",
      },
      fr: {
        name: "Saladier",
        description: "Description provisoire. Un court paragraphe sur cette pièce en bois d'olivier sculptée à la main à Bethléem sera ajouté ici prochainement.",
      },
      es: {
        name: "Ensaladera",
        description: "Descripción provisional. Pronto añadiremos aquí un breve párrafo sobre esta pieza de madera de olivo tallada a mano en Belén.",
      },
      it: {
        name: "Insalatiera",
        description: "Descrizione provvisoria. A breve aggiungeremo qui un breve paragrafo su questo pezzo in legno d'ulivo intagliato a mano a Betlemme.",
      },
      de: {
        name: "Salatschüssel",
        description: "Platzhaltertext. Hier folgt bald ein kurzer Absatz über dieses in Bethlehem von Hand geschnitzte Stück aus Olivenholz.",
      },
      el: {
        name: "Σαλατιέρα",
        description: "Προσωρινή περιγραφή. Σύντομα θα προστεθεί εδώ μια μικρή παράγραφος για αυτό το χειροποίητο κομμάτι από ελιόξυλο της Βηθλεέμ.",
      },
      pl: {
        name: "Miska do sałatek",
        description: "Opis tymczasowy. Wkrótce dodamy tu krótki akapit o tym ręcznie rzeźbionym w Betlejem przedmiocie z drewna oliwnego.",
      },
      ro: {
        name: "Bol pentru salată",
        description: "Descriere provizorie. În curând vom adăuga aici un scurt paragraf despre această piesă din lemn de măslin sculptată manual în Betleem.",
      },
      uk: {
        name: "Салатниця",
        description: "Тимчасовий опис. Незабаром тут з'явиться короткий абзац про цей виріб з оливкового дерева ручної різьби з Вифлеєма.",
      },
      pt: {
        name: "Saladeira",
        description: "Descrição provisória. Em breve acrescentaremos aqui um pequeno parágrafo sobre esta peça em madeira de oliveira esculpida à mão em Belém.",
      },
    },
  },
  {
    id: 11,
    slug: "serving-board",
    category: "home",
    priceUsd: 49,
    image: "/images/products/serving-board.webp",
    text: {
      en: {
        name: "Serving Board",
        description: "Placeholder description. A short paragraph about this hand-carved olive wood piece from Bethlehem will be added here soon.",
      },
      fr: {
        name: "Planche de service",
        description: "Description provisoire. Un court paragraphe sur cette pièce en bois d'olivier sculptée à la main à Bethléem sera ajouté ici prochainement.",
      },
      es: {
        name: "Tabla de servir",
        description: "Descripción provisional. Pronto añadiremos aquí un breve párrafo sobre esta pieza de madera de olivo tallada a mano en Belén.",
      },
      it: {
        name: "Tagliere da portata",
        description: "Descrizione provvisoria. A breve aggiungeremo qui un breve paragrafo su questo pezzo in legno d'ulivo intagliato a mano a Betlemme.",
      },
      de: {
        name: "Servierbrett",
        description: "Platzhaltertext. Hier folgt bald ein kurzer Absatz über dieses in Bethlehem von Hand geschnitzte Stück aus Olivenholz.",
      },
      el: {
        name: "Ξύλο σερβιρίσματος",
        description: "Προσωρινή περιγραφή. Σύντομα θα προστεθεί εδώ μια μικρή παράγραφος για αυτό το χειροποίητο κομμάτι από ελιόξυλο της Βηθλεέμ.",
      },
      pl: {
        name: "Deska do serwowania",
        description: "Opis tymczasowy. Wkrótce dodamy tu krótki akapit o tym ręcznie rzeźbionym w Betlejem przedmiocie z drewna oliwnego.",
      },
      ro: {
        name: "Platou de servire",
        description: "Descriere provizorie. În curând vom adăuga aici un scurt paragraf despre această piesă din lemn de măslin sculptată manual în Betleem.",
      },
      uk: {
        name: "Дошка для подачі",
        description: "Тимчасовий опис. Незабаром тут з'явиться короткий абзац про цей виріб з оливкового дерева ручної різьби з Вифлеєма.",
      },
      pt: {
        name: "Tábua de servir",
        description: "Descrição provisória. Em breve acrescentaremos aqui um pequeno parágrafo sobre esta peça em madeira de oliveira esculpida à mão em Belém.",
      },
    },
  },
  {
    id: 12,
    slug: "candle-holder-pair",
    category: "home",
    priceUsd: 34,
    image: "/images/products/candle-holder-pair.webp",
    text: {
      en: {
        name: "Candle Holders, Pair",
        description: "Placeholder description. A short paragraph about this hand-carved olive wood piece from Bethlehem will be added here soon.",
      },
      fr: {
        name: "Bougeoirs, la paire",
        description: "Description provisoire. Un court paragraphe sur cette pièce en bois d'olivier sculptée à la main à Bethléem sera ajouté ici prochainement.",
      },
      es: {
        name: "Candelabros, pareja",
        description: "Descripción provisional. Pronto añadiremos aquí un breve párrafo sobre esta pieza de madera de olivo tallada a mano en Belén.",
      },
      it: {
        name: "Portacandele, coppia",
        description: "Descrizione provvisoria. A breve aggiungeremo qui un breve paragrafo su questo pezzo in legno d'ulivo intagliato a mano a Betlemme.",
      },
      de: {
        name: "Kerzenhalter, Paar",
        description: "Platzhaltertext. Hier folgt bald ein kurzer Absatz über dieses in Bethlehem von Hand geschnitzte Stück aus Olivenholz.",
      },
      el: {
        name: "Κηροπήγια, ζεύγος",
        description: "Προσωρινή περιγραφή. Σύντομα θα προστεθεί εδώ μια μικρή παράγραφος για αυτό το χειροποίητο κομμάτι από ελιόξυλο της Βηθλεέμ.",
      },
      pl: {
        name: "Świeczniki, para",
        description: "Opis tymczasowy. Wkrótce dodamy tu krótki akapit o tym ręcznie rzeźbionym w Betlejem przedmiocie z drewna oliwnego.",
      },
      ro: {
        name: "Sfeșnice, pereche",
        description: "Descriere provizorie. În curând vom adăuga aici un scurt paragraf despre această piesă din lemn de măslin sculptată manual în Betleem.",
      },
      uk: {
        name: "Свічники, пара",
        description: "Тимчасовий опис. Незабаром тут з'явиться короткий абзац про цей виріб з оливкового дерева ручної різьби з Вифлеєма.",
      },
      pt: {
        name: "Castiçais, par",
        description: "Descrição provisória. Em breve acrescentaremos aqui um pequeno parágrafo sobre esta peça em madeira de oliveira esculpida à mão em Belém.",
      },
    },
  },
] as const satisfies readonly ProductRecord[];
