import React, { useState, useEffect, useRef } from 'react'

interface TagManagerProps {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  maxTags?: number
}

// Generates cohesive HSL colors dynamically from a string hash
export const getTagStyles = (tag: string) => {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return {
    backgroundColor: `hsl(${hue}, 85%, 96%)`,
    color: `hsl(${hue}, 70%, 30%)`,
    borderColor: `hsl(${hue}, 60%, 90%)`,
  }
}

export const TagManager: React.FC<TagManagerProps> = ({
  tags,
  onChange,
  suggestions = [],
  maxTags = 10,
}) => {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(inputValue)
    }
  }

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase()
    if (!trimmed) return
    if (tags.includes(trimmed)) {
      setInputValue('')
      return
    }
    if (tags.length >= maxTags) {
      alert(`You can add a maximum of ${maxTags} tags.`)
      return
    }
    onChange([...tags, trimmed])
    setInputValue('')
    setShowSuggestions(false)
  }

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, i) => i !== indexToRemove))
  }

  const filteredSuggestions = suggestions.filter(
    (s) => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s.toLowerCase())
  )

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="flex flex-wrap items-center gap-1.5 p-2 min-h-[42px] border border-gray-200 rounded-lg focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all bg-white">
        {tags.map((tag, idx) => {
          const styles = getTagStyles(tag)
          return (
            <span
              key={idx}
              style={styles}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full border transition-all hover:opacity-90"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(idx)}
                className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors text-current font-bold"
              >
                &times;
              </button>
            </span>
          )
        })}

        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setShowSuggestions(true)
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? 'Type tag and press Enter...' : ''}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none py-0.5 text-sm text-gray-700"
        />
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto py-1">
          {filteredSuggestions.map((item, index) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => addTag(item)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
