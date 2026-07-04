export type EasternCity = {
  name: string
  neighborhoods: string[]
}

export const SAUDI_EASTERN_CITIES: EasternCity[] = [
  {
    name: "الخبر",
    neighborhoods: [
      "حي الشراع",
      "حي النورس",
      "حي أجيال",
      "حي العليا",
      "حي الحمراء",
      "الثقبة",
      "الخبر الشمالية",
      "أخرى",
    ],
  },
  {
    name: "الدمام",
    neighborhoods: [
      "حي الفيصلية",
      "حي الشاطئ",
      "حي الأدامة",
      "حي العنود",
      "حي المزروعية",
      "حي الراكة",
      "حي البادية",
      "أخرى",
    ],
  },
  {
    name: "الظهران",
    neighborhoods: [
      "حي الدوحة",
      "حي الجامعة",
      "حي الخالدية",
      "حي الدانة",
      "غرب الظهران",
      "حي القشلة",
      "أخرى",
    ],
  },
  {
    name: "القطيف",
    neighborhoods: [
      "العوامية",
      "صفوى",
      "حي القدس",
      "الجش",
      "تاروت",
      "النابية",
      "أخرى",
    ],
  },
  {
    name: "الأحساء",
    neighborhoods: [
      "الهفوف",
      "المبرز",
      "العيون",
      "الجفر",
      "العمران",
      "أخرى",
    ],
  },
]

export const EASTERN_CITY_NAMES = SAUDI_EASTERN_CITIES.map((city) => city.name)

export function getNeighborhoodsForCity(cityName: string): string[] {
  return (
    SAUDI_EASTERN_CITIES.find((city) => city.name === cityName)?.neighborhoods ??
    []
  )
}
