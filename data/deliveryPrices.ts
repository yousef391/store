export interface DeliveryFee {
  domicile: number;
  stopdesk: number;
}

export type DeliveryType = "domicile" | "stopdesk";

// Official Ecom-dz shipping tariffs (Depart: ORAN) for all 58 Algerian Wilayas
export const WILAYA_DELIVERY_PRICES: Record<number, DeliveryFee> = {
  1: { domicile: 1100, stopdesk: 750 },   // Adrar
  2: { domicile: 650, stopdesk: 350 },    // Chlef
  3: { domicile: 800, stopdesk: 500 },    // Laghouat
  4: { domicile: 720, stopdesk: 420 },    // Oum El Bouaghi
  5: { domicile: 730, stopdesk: 450 },    // Batna
  6: { domicile: 720, stopdesk: 420 },    // Béjaïa
  7: { domicile: 800, stopdesk: 500 },    // Biskra
  8: { domicile: 1000, stopdesk: 700 },   // Béchar
  9: { domicile: 580, stopdesk: 380 },    // Blida
  10: { domicile: 700, stopdesk: 420 },   // Bouira
  11: { domicile: 1500, stopdesk: 1050 }, // Tamanrasset
  12: { domicile: 750, stopdesk: 450 },   // Tébessa
  13: { domicile: 650, stopdesk: 350 },   // Tlemcen
  14: { domicile: 700, stopdesk: 400 },   // Tiaret
  15: { domicile: 680, stopdesk: 380 },   // Tizi Ouzou
  16: { domicile: 480, stopdesk: 350 },   // Alger
  17: { domicile: 800, stopdesk: 500 },   // Djelfa
  18: { domicile: 720, stopdesk: 420 },   // Jijel
  19: { domicile: 720, stopdesk: 420 },   // Sétif
  20: { domicile: 700, stopdesk: 420 },   // Saïda
  21: { domicile: 720, stopdesk: 420 },   // Skikda
  22: { domicile: 650, stopdesk: 400 },   // Sidi Bel Abbès
  23: { domicile: 720, stopdesk: 420 },   // Annaba
  24: { domicile: 730, stopdesk: 450 },   // Guelma
  25: { domicile: 700, stopdesk: 380 },   // Constantine
  26: { domicile: 700, stopdesk: 400 },   // Médéa
  27: { domicile: 650, stopdesk: 400 },   // Mostaganem
  28: { domicile: 720, stopdesk: 420 },   // M'Sila
  29: { domicile: 700, stopdesk: 400 },   // Mascara
  30: { domicile: 900, stopdesk: 550 },   // Ouargla
  31: { domicile: 400, stopdesk: 300 },   // Oran
  32: { domicile: 970, stopdesk: 700 },   // El Bayadh
  33: { domicile: 1500, stopdesk: 1050 }, // Illizi
  34: { domicile: 720, stopdesk: 420 },   // Bordj Bou Arreridj
  35: { domicile: 580, stopdesk: 380 },   // Boumerdès
  36: { domicile: 750, stopdesk: 450 },   // El Tarf
  37: { domicile: 1100, stopdesk: 750 },  // Tindouf
  38: { domicile: 700, stopdesk: 420 },   // Tissemsilt
  39: { domicile: 900, stopdesk: 550 },   // El Oued
  40: { domicile: 730, stopdesk: 450 },   // Khenchela
  41: { domicile: 730, stopdesk: 450 },   // Souk Ahras
  42: { domicile: 580, stopdesk: 380 },   // Tipaza
  43: { domicile: 730, stopdesk: 450 },   // Mila
  44: { domicile: 700, stopdesk: 420 },   // Ain Defla
  45: { domicile: 930, stopdesk: 550 },   // Naâma
  46: { domicile: 600, stopdesk: 400 },   // Ain Témouchent
  47: { domicile: 850, stopdesk: 500 },   // Ghardaïa
  48: { domicile: 680, stopdesk: 400 },   // Relizane
  49: { domicile: 1100, stopdesk: 750 },  // Timimoun
  50: { domicile: 1500, stopdesk: 1050 }, // Bordj Badji Mokhtar
  51: { domicile: 800, stopdesk: 500 },   // Ouled Djellal
  52: { domicile: 1000, stopdesk: 750 },  // Beni Abbes
  53: { domicile: 1400, stopdesk: 950 },  // In Salah
  54: { domicile: 1500, stopdesk: 1050 }, // In Guezzam
  55: { domicile: 930, stopdesk: 550 },   // Touggourt
  56: { domicile: 2100, stopdesk: 1500 }, // Djanet
  57: { domicile: 930, stopdesk: 550 },   // El M'Ghair
  58: { domicile: 850, stopdesk: 500 },   // El Meniaa
};

/**
 * Returns the exact delivery fee for a given wilaya ID and delivery type.
 */
export function getDeliveryFee(
  wilayaId: number | string | undefined | null,
  type: DeliveryType = "domicile"
): number {
  if (!wilayaId) return 0;
  const idNum = typeof wilayaId === "string" ? parseInt(wilayaId, 10) : wilayaId;
  const rates = WILAYA_DELIVERY_PRICES[idNum];
  if (!rates) return type === "stopdesk" ? 450 : 700;
  return type === "stopdesk" ? rates.stopdesk : rates.domicile;
}

/**
 * Returns both domicile and stopdesk fees for a wilaya.
 */
export function getWilayaRates(wilayaId: number | string | undefined | null): DeliveryFee | null {
  if (!wilayaId) return null;
  const idNum = typeof wilayaId === "string" ? parseInt(wilayaId, 10) : wilayaId;
  return WILAYA_DELIVERY_PRICES[idNum] || null;
}
