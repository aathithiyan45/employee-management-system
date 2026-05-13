import React, { useState, useRef, useEffect } from "react";
import "./SearchableSelect.css";

function SearchableSelect({ options, placeholder, onSelect, value, displayKey = "name", valueKey = "id", subKey = "emp_id" }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Sync searchTerm with initial value if provided
  useEffect(() => {
    if (value) {
      const selected = options.find(opt => opt[valueKey] === value);
      if (selected) {
        setSearchTerm(`${selected[subKey]} - ${selected[displayKey]}`);
      }
    } else {
      setSearchTerm("");
    }
  }, [value, options, valueKey, displayKey, subKey]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    `${opt[subKey]} ${opt[displayKey]}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (opt) => {
    setSearchTerm(`${opt[subKey]} - ${opt[displayKey]}`);
    setIsOpen(false);
    onSelect(opt[valueKey]);
  };

  return (
    <div className="searchable-select-wrapper" ref={wrapperRef}>
      <input
        type="text"
        className="searchable-select-input"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
          if (e.target.value === "") onSelect(""); // Clear selection
        }}
        onFocus={() => setIsOpen(true)}
      />
      <div className="searchable-select-arrow">▼</div>
      
      {isOpen && (
        <div className="searchable-select-dropdown">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(opt => (
              <div
                key={opt[valueKey]}
                className={`searchable-select-option ${value === opt[valueKey] ? "selected" : ""}`}
                onClick={() => handleSelect(opt)}
              >
                <span className="option-id">{opt[subKey]}</span>
                <span className="option-name">{opt[displayKey]}</span>
              </div>
            ))
          ) : (
            <div className="searchable-select-no-results">No matches found</div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;
