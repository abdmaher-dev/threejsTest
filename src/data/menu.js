// Mock menu data. When the backend exists, this shape is what GET /api/menu should return.
//
// Each item's `visual` block drives the 3D cup:
//   cup:     "small" | "medium" | "large"   cup size
//   fill:    0..1                           how full the cup is
//   surface: texture style for the drink's top (see src/surfaces.js)
//   steam:   0..1                           how much steam rises

export const menu = {
  currency: "USD",
  categories: [
    {
      id: "espresso",
      name: "Espresso Bar",
      items: [
        {
          id: "espresso",
          name: "Espresso",
          description: "Double shot of our house dark roast. Bittersweet cocoa, toasted hazelnut crema.",
          price: 3.2,
          tags: ["Signature"],
          visual: { cup: "small", fill: 0.62, surface: "crema", steam: 0.8 },
        },
        {
          id: "ristretto",
          name: "Ristretto",
          description: "Short, syrupy, intense. The first and sweetest part of the shot.",
          price: 3.4,
          tags: [],
          visual: { cup: "small", fill: 0.45, surface: "crema-dark", steam: 0.7 },
        },
        {
          id: "macchiato",
          name: "Macchiato",
          description: "Espresso marked with a spoon of velvet microfoam.",
          price: 3.6,
          tags: [],
          visual: { cup: "small", fill: 0.7, surface: "macchiato", steam: 0.7 },
        },
        {
          id: "americano",
          name: "Americano",
          description: "Double shot opened up with hot water. Long, clean and dark.",
          price: 3.8,
          tags: [],
          visual: { cup: "large", fill: 0.86, surface: "black", steam: 1 },
        },
      ],
    },
    {
      id: "milk",
      name: "Milk & Foam",
      items: [
        {
          id: "cortado",
          name: "Cortado",
          description: "Equal parts espresso and silky steamed milk.",
          price: 4.2,
          tags: [],
          visual: { cup: "medium", fill: 0.8, surface: "heart", steam: 0.8 },
        },
        {
          id: "flat-white",
          name: "Flat White",
          description: "Ristretto shots under a thin, glossy layer of microfoam.",
          price: 4.6,
          tags: ["Popular"],
          visual: { cup: "medium", fill: 0.9, surface: "rosetta", steam: 0.9 },
        },
        {
          id: "cappuccino",
          name: "Cappuccino",
          description: "Deep foam cap dusted with dark cocoa.",
          price: 4.5,
          tags: [],
          visual: { cup: "large", fill: 0.93, surface: "cappuccino", steam: 0.8 },
        },
        {
          id: "latte",
          name: "Café Latte",
          description: "Espresso, plenty of steamed milk, finished with a tulip.",
          price: 4.8,
          tags: [],
          visual: { cup: "large", fill: 0.92, surface: "tulip", steam: 0.9 },
        },
        {
          id: "mocha",
          name: "Midnight Mocha",
          description: "70% dark chocolate, espresso and milk, swirled with foam.",
          price: 5.4,
          tags: ["Signature"],
          visual: { cup: "large", fill: 0.9, surface: "mocha", steam: 0.9 },
        },
      ],
    },
    {
      id: "slow",
      name: "Slow Brew",
      items: [
        {
          id: "pour-over",
          name: "Black Pour-Over",
          description: "Single-origin dark roast, hand poured. Molasses, plum, smoke.",
          price: 5.0,
          tags: [],
          visual: { cup: "large", fill: 0.84, surface: "black-glossy", steam: 1 },
        },
        {
          id: "cardamom",
          name: "Cardamom Coffee",
          description: "Finely ground dark roast simmered with cardamom, thick foam on top.",
          price: 4.0,
          tags: ["New"],
          visual: { cup: "small", fill: 0.78, surface: "cardamom", steam: 1 },
        },
      ],
    },
  ],
};
