import { useState, useEffect } from "react";
import { Phone, ChevronDown } from "lucide-react";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" },
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸" },
  { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹" },
  { code: "PT", name: "Portugal", dialCode: "+351", flag: "🇵🇹" },
  { code: "BE", name: "Belgium", dialCode: "+32", flag: "🇧🇪" },
  { code: "CH", name: "Switzerland", dialCode: "+41", flag: "🇨🇭" },
  { code: "NL", name: "Netherlands", dialCode: "+31", flag: "🇳🇱" },
  { code: "SE", name: "Sweden", dialCode: "+46", flag: "🇸🇪" },
  { code: "NO", name: "Norway", dialCode: "+47", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", dialCode: "+45", flag: "🇩🇰" },
  { code: "FI", name: "Finland", dialCode: "+358", flag: "🇫🇮" },
  { code: "PL", name: "Poland", dialCode: "+48", flag: "🇵🇱" },
  { code: "RO", name: "Romania", dialCode: "+40", flag: "🇷🇴" },
  { code: "GR", name: "Greece", dialCode: "+30", flag: "🇬🇷" },
  { code: "TR", name: "Turkey", dialCode: "+90", flag: "🇹🇷" },
  { code: "RU", name: "Russia", dialCode: "+7", flag: "🇷🇺" },
  { code: "CN", name: "China", dialCode: "+86", flag: "🇨🇳" },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵" },
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", dialCode: "+52", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", dialCode: "+54", flag: "🇦🇷" },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦" },
  { code: "EG", name: "Egypt", dialCode: "+20", flag: "🇪🇬" },
  { code: "MA", name: "Morocco", dialCode: "+212", flag: "🇲🇦" },
  { code: "DZ", name: "Algeria", dialCode: "+213", flag: "🇩🇿" },
  { code: "TN", name: "Tunisia", dialCode: "+216", flag: "🇹🇳" },
  { code: "SN", name: "Senegal", dialCode: "+221", flag: "🇸🇳" },
  { code: "CI", name: "Côte d'Ivoire", dialCode: "+225", flag: "🇨🇮" },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function PhoneInput({ 
  value, 
  onChange, 
  placeholder = "Ex: 6 12 34 56 78",
  required = false,
  className = ""
}: PhoneInputProps) {
  // Parse the phone number into country code and number
  const parsePhoneNumber = (phoneNumber: string): { countryCode: string; number: string } => {
    if (!phoneNumber) {
      return { countryCode: "FR", number: "" };
    }

    // Find the matching country code
    const matchingCountry = COUNTRIES.find(country => phoneNumber.startsWith(country.dialCode));
    
    if (matchingCountry) {
      const number = phoneNumber.substring(matchingCountry.dialCode.length).trim();
      return { countryCode: matchingCountry.code, number };
    }

    return { countryCode: "FR", number: phoneNumber };
  };

  const { countryCode: initialCountryCode, number: initialNumber } = parsePhoneNumber(value);
  const [selectedCountryCode, setSelectedCountryCode] = useState(initialCountryCode);
  const [phoneNumber, setPhoneNumber] = useState(initialNumber);

  // Update parent when country code or number changes
  useEffect(() => {
    const country = COUNTRIES.find(c => c.code === selectedCountryCode) || COUNTRIES[0];
    const fullPhoneNumber = phoneNumber 
      ? `${country.dialCode} ${phoneNumber}`.trim()
      : "";
    
    // Only call onChange if the value is actually different
    if (fullPhoneNumber !== value) {
      onChange(fullPhoneNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountryCode, phoneNumber]);

  // Update local state when value prop changes externally (only if different)
  useEffect(() => {
    const { countryCode, number } = parsePhoneNumber(value);
    const country = COUNTRIES.find(c => c.code === selectedCountryCode) || COUNTRIES[0];
    const currentFullNumber = phoneNumber ? `${country.dialCode} ${phoneNumber}`.trim() : "";
    
    // Only update if the external value is different from what we have locally
    if (value !== currentFullNumber) {
      setSelectedCountryCode(countryCode);
      setPhoneNumber(number);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleCountryChange = (newCode: string) => {
    setSelectedCountryCode(newCode);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and spaces
    const cleaned = e.target.value.replace(/[^\d\s]/g, "");
    setPhoneNumber(cleaned);
  };

  const selectedCountry = COUNTRIES.find(c => c.code === selectedCountryCode) || COUNTRIES[0];

  return (
    <div className={`flex gap-2 ${className}`}>
      {/* Country Code Selector */}
      <div className="w-32">
        <Select value={selectedCountryCode} onValueChange={handleCountryChange}>
          <SelectTrigger className="text-gray-900">
            <SelectValue>
              <div className="flex items-center gap-2">
                <span className="text-lg">{selectedCountry.flag}</span>
                <span className="text-sm">{selectedCountry.dialCode}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {COUNTRIES.map((country) => (
              <SelectItem 
                key={country.code} 
                value={country.code}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{country.flag}</span>
                  <span className="text-sm">{country.dialCode}</span>
                  <span className="text-sm text-gray-600">{country.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Phone Number Input */}
      <div className="flex-1 relative">
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <Input
          type="tel"
          value={phoneNumber}
          onChange={handleNumberChange}
          placeholder={placeholder}
          className="pl-10 text-gray-900"
          required={required}
        />
      </div>
    </div>
  );
}