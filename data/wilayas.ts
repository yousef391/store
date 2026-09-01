// Domicile (Home) delivery default zone prices
export const defaultZonePrices: Record<number, number> = {
  0: 400,   // Oran
  1: 500,   // Alger, SBA, Mostaganem, Mascara, A.T.
  2: 700,   // Nord / Hauts Plateaux
  3: 750,   // Sud proche
  4: 800,   // Sud lointain
  5: 1400,  // Grand Sud
};

// Stopdesk (Bureau) delivery default zone prices
export const defaultStopdeskZonePrices: Record<number, number> = {
  0: 300,   // Oran
  1: 350,   // Alger, SBA, Mostaganem, Mascara, A.T.
  2: 400,   // Nord / Hauts Plateaux
  3: 500,   // Sud proche
  4: 700,   // Sud lointain
  5: 1050,  // Grand Sud
};

export const zonePrices: Record<number, number> = defaultZonePrices;

export const zoneLabels: Record<number, string> = {
  0: "Oran",
  1: "Alger, SBA, Mostaganem, Mascara, A.T.",
  2: "Nord / Hauts Plateaux",
  3: "Sud proche",
  4: "Sud lointain",
  5: "Grand Sud",
};
