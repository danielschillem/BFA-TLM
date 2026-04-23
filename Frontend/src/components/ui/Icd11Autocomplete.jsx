import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { icd11Api } from "@/api";

/**
 * Autocomplete ICD-11 — recherche par symptôme ou maladie.
 *
 * @param {object}   value        - { code, title, uri } ou null
 * @param {function} onChange     - (selected: { code, title, uri } | null) => void
 * @param {string}   [label]
 * @param {string}   [placeholder]
 * @param {number}   [limit=8]
 * @param {number}   [debounceMs=400]
 */
export default function Icd11Autocomplete({
  value,
  onChange,
  label = "Recherche CIM-11 (OMS)",
  placeholder = "Tapez un symptôme ou une maladie…",
  limit = 8,
  debounceMs = 400,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(
    (q) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (q.trim().length < 2) {
        setResults([]);
        setShowDropdown(false);
        return;
      }
      timerRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const res = await icd11Api.search({ q, limit });
          const items = res.data?.results || res.data?.data || [];
          setResults(items);
          setShowDropdown(items.length > 0);
        } catch {
          setResults([]);
          setShowDropdown(false);
        }
        setLoading(false);
      }, debounceMs);
    },
    [limit, debounceMs],
  );

  const handleInputChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    search(v);
  };

  const select = (item) => {
    const selected = {
      code: item.code || item.theCode || "",
      title: item.title || item.label || item.name || "",
      uri: item.uri || item.id || "",
    };
    onChange(selected);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  };

  const clear = () => {
    onChange(null);
    setQuery("");
    setResults([]);
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      {/* Selected value display */}
      {value?.code ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <span className="font-mono text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
            {value.code}
          </span>
          <span className="text-gray-800 flex-1 truncate">{value.title}</span>
          <button
            type="button"
            onClick={clear}
            className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            placeholder={placeholder}
            autoComplete="off"
          />
          {loading && (
            <Loader2 className="absolute right-2.5 top-2.5 w-4 h-4 text-primary-500 animate-spin" />
          )}
        </div>
      )}

      {/* Dropdown results */}
      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {results.map((item, idx) => {
            const code = item.code || item.theCode || "";
            const title = item.title || item.label || item.name || "";
            return (
              <button
                key={code + idx}
                type="button"
                onClick={() => select(item)}
                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
              >
                {code && (
                  <span className="inline-block font-mono text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mr-2">
                    {code}
                  </span>
                )}
                <span className="text-sm text-gray-800">{title}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
