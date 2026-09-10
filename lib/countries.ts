// Country list for onboarding. A curated global list, kept in one place.
// Sorted alphabetically in code (not by hand) so the order is guaranteed
// no matter how the list is edited later. "Other" is forced last, the
// standard position for catch-all options.
//
// Phase 1 note (recommendation R8): this list lives in code. When the
// admin panel arrives in Phase 7, it can move to a Firestore config
// document so admins can edit it without a code deploy.

const COUNTRY_LIST: string[] = [
  "Algeria", "Angola", "Argentina", "Australia", "Bangladesh", "Benin",
  "Botswana", "Brazil", "Burkina Faso", "Burundi", "Cabo Verde",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile",
  "China", "Colombia", "Comoros", "Congo (Brazzaville)",
  "Congo (Kinshasa)", "Cote d'Ivoire", "Djibouti", "Egypt",
  "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia", "France",
  "Gabon", "Gambia", "Germany", "Ghana", "Guinea", "Guinea-Bissau",
  "India", "Indonesia", "Italy", "Japan", "Kenya", "Lesotho", "Liberia",
  "Libya", "Madagascar", "Malawi", "Malaysia", "Mali", "Mauritania",
  "Mauritius", "Mexico", "Morocco", "Mozambique", "Namibia",
  "Netherlands", "New Zealand", "Niger", "Nigeria", "Pakistan",
  "Philippines", "Poland", "Portugal", "Qatar", "Rwanda",
  "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Seychelles",
  "Sierra Leone", "Singapore", "Somalia", "South Africa", "South Korea",
  "South Sudan", "Spain", "Sudan", "Tanzania", "Togo", "Tunisia",
  "Turkey", "Uganda", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Vietnam", "Zambia", "Zimbabwe",
];

export const COUNTRIES: string[] = [
  ...COUNTRY_LIST.sort((a, b) => a.localeCompare(b)),
  "Other",
];