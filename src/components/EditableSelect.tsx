import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export type DBRecord = Record<string, any>;

export interface EditableSelectProps<T extends DBRecord = DBRecord> {
  value: string;
  table: string;
  displayField: string;
  extraFields?: string[];
  placeholder?: string;
  /**
   * Called when an option is selected (item) OR when user types a custom value.
   * - If a DB record was chosen, `item` is the record and `typedValue` is undefined.
   * - If a custom typed value should be delivered, call with (null, typedValue).
   */
  onSelect: (item: T | null, typedValue?: string) => void;
  disableFreeType?: boolean; 
}

export function EditableSelect<T extends DBRecord = DBRecord>({
  value,
  table,
  displayField,
  extraFields = [],
  placeholder,
  onSelect,
  disableFreeType = false,
}: EditableSelectProps<T>) {
  const [query, setQuery] = useState<string>(value || "");
  const [options, setOptions] = useState<T[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!query || query.trim() === "") {
      setOptions([]);
      return;
    }

    const fetch = async () => {
        const fields = ["id", displayField, ...extraFields];
        const { data } = await supabase
            .from(table)
            .select(fields.join(","))
            .ilike(displayField, `%${query}%`)
            .limit(10);

        setOptions((data as unknown as T[]) || []);
    };

    const t = setTimeout(fetch, 250);
    return () => clearTimeout(t);
  }, [query, table, displayField, extraFields]);

  return (
    <div className="relative w-full">
      <input
        className="w-full border p-1 rounded"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => {
            setTimeout(() => {
            setShowDropdown(false);

            // ✅ Only call onSelect(null, query) if free typing is allowed
            if (!disableFreeType) {
                onSelect(null, query);
            } else {
                // 🚫 If free typing is disabled, reset to the current selected value
                setQuery(value || "");
            }
            }, 150);
        }}
        />


      {showDropdown && options.length > 0 && (
        <ul className="absolute bg-white border rounded shadow w-full max-h-40 overflow-auto z-10">
          {options.map((opt) => (
            <li
              key={String(opt.id)}
              className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
              onMouseDown={(e) => {
                // use onMouseDown to avoid blur-before-click problems
                e.preventDefault();
                setQuery(String(opt[displayField]));
                setShowDropdown(false);
                onSelect(opt);
              }}
            >
              {String(opt[displayField])}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
