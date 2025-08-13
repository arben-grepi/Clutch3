import { ImageSourcePropType } from "react-native";

export interface Country {
  name: string;
  code: string;
}

export interface State {
  name: string;
  code: string;
}

// List of countries (alphabetically ordered)
export const countries: Country[] = [
  { name: "Albania", code: "albania" },
  { name: "Andorra", code: "andorra" },
  { name: "Austria", code: "austria" },
  { name: "Belarus", code: "belarus" },
  { name: "Belgium", code: "belgium" },
  { name: "Bosnia and Herzegovina", code: "bosnia_and_herzegovina" },
  { name: "Bulgaria", code: "bulgaria" },
  { name: "Croatia", code: "croatia" },
  { name: "Cyprus", code: "cyprus" },
  { name: "Czech Republic", code: "czech_republic" },
  { name: "Denmark", code: "denmark" },
  { name: "Estonia", code: "estonia" },
  { name: "Finland", code: "finland" },
  { name: "France", code: "france" },
  { name: "Germany", code: "germany" },
  { name: "Greece", code: "greece" },
  { name: "Hungary", code: "hungary" },
  { name: "Iceland", code: "iceland" },
  { name: "Ireland", code: "ireland" },
  { name: "Italy", code: "italy" },
  { name: "Kosovo", code: "kosovo" },
  { name: "Latvia", code: "latvia" },
  { name: "Liechtenstein", code: "liechtenstein" },
  { name: "Lithuania", code: "lithuania" },
  { name: "Luxembourg", code: "luxembourg" },
  { name: "Malta", code: "malta" },
  { name: "Moldova", code: "moldova" },
  { name: "Monaco", code: "monaco" },
  { name: "Montenegro", code: "montenegro" },
  { name: "Netherlands", code: "netherlands" },
  { name: "North Macedonia", code: "north_macedonia" },
  { name: "Norway", code: "norway" },
  { name: "Poland", code: "poland" },
  { name: "Portugal", code: "portugal" },
  { name: "Romania", code: "romania" },
  { name: "Russia", code: "russia" },
  { name: "San Marino", code: "san_marino" },
  { name: "Serbia", code: "serbia" },
  { name: "Slovakia", code: "slovakia" },
  { name: "Slovenia", code: "slovenia" },
  { name: "Spain", code: "spain" },
  { name: "Sweden", code: "sweden" },
  { name: "Switzerland", code: "switzerland" },
  { name: "Ukraine", code: "ukraine" },
  { name: "United Kingdom", code: "united_kingdom" },
  { name: "United States", code: "united_states" },
  { name: "Vatican City", code: "vatican_city" },
  { name: "Other", code: "other" },
];

// List of US states (alphabetically ordered)
export const states: State[] = [
  { name: "Alabama", code: "alabama" },
  { name: "Alaska", code: "alaska" },
  { name: "Arizona", code: "arizona" },
  { name: "Arkansas", code: "arkansas" },
  { name: "California", code: "california" },
  { name: "Colorado", code: "colorado" },
  { name: "Connecticut", code: "connecticut" },
  { name: "Delaware", code: "delaware" },
  { name: "Florida", code: "florida" },
  { name: "Georgia", code: "georgia" },
  { name: "Hawaii", code: "hawaii" },
  { name: "Idaho", code: "idaho" },
  { name: "Illinois", code: "illinois" },
  { name: "Indiana", code: "indiana" },
  { name: "Iowa", code: "iowa" },
  { name: "Kansas", code: "kansas" },
  { name: "Kentucky", code: "kentucky" },
  { name: "Louisiana", code: "louisiana" },
  { name: "Maine", code: "maine" },
  { name: "Maryland", code: "maryland" },
  { name: "Massachusetts", code: "massachusetts" },
  { name: "Michigan", code: "michigan" },
  { name: "Minnesota", code: "minnesota" },
  { name: "Mississippi", code: "mississippi" },
  { name: "Missouri", code: "missouri" },
  { name: "Montana", code: "montana" },
  { name: "Nebraska", code: "nebraska" },
  { name: "Nevada", code: "nevada" },
  { name: "New Hampshire", code: "new_hampshire" },
  { name: "New Jersey", code: "new_jersey" },
  { name: "New Mexico", code: "new_mexico" },
  { name: "New York", code: "new_york" },
  { name: "North Carolina", code: "north_carolina" },
  { name: "North Dakota", code: "north_dakota" },
  { name: "Ohio", code: "ohio" },
  { name: "Oklahoma", code: "oklahoma" },
  { name: "Oregon", code: "oregon" },
  { name: "Pennsylvania", code: "pennsylvania" },
  { name: "Rhode Island", code: "rhode_island" },
  { name: "South Carolina", code: "south_carolina" },
  { name: "South Dakota", code: "south_dakota" },
  { name: "Tennessee", code: "tennessee" },
  { name: "Texas", code: "texas" },
  { name: "Utah", code: "utah" },
  { name: "Vermont", code: "vermont" },
  { name: "Virginia", code: "virginia" },
  { name: "Washington", code: "washington" },
  { name: "West Virginia", code: "west_virginia" },
  { name: "Wisconsin", code: "wisconsin" },
  { name: "Wyoming", code: "wyoming" },
];

// Add default export to satisfy Expo Router
export default function LocationData() {
  return null;
}
