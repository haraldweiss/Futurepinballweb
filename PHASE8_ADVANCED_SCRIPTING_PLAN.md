# Phase 8: Advanced Scripting — Implementation Plan

## Overview

Phase 8 focuses on extending VBScript support with additional functions and game object capabilities that are commonly used in Future Pinball tables.

**Goal**: Add missing VBScript functions for arrays, strings, dates, and game object queries
**Estimated Time**: 5-8 hours
**Expected Improvement**: Support for 90%+ of VBScript usage patterns in existing tables

---

## Current Status Analysis

### Already Implemented (Phase 1-4) ✅

**String Functions**:
- ✅ Len(s) - String length
- ✅ UCase(s) - Uppercase
- ✅ LCase(s) - Lowercase
- ✅ Trim(s) - Trim whitespace
- ✅ Chr(n) - Char from code
- ✅ Mid(s, start, len) - Substring (basic)

**Math Functions**:
- ✅ Abs(n) - Absolute value
- ✅ Int(n) - Integer part
- ✅ Fix(n) - Truncate
- ✅ Sgn(n) - Sign (-1, 0, 1)
- ✅ Sqr(n) - Square root
- ✅ Rnd() - Random 0-1

**Type Conversion**:
- ✅ CInt(s) - To integer
- ✅ CDbl(s) - To double
- ✅ CStr(x) - To string

**Control Flow**:
- ✅ If/ElseIf/Else
- ✅ For/Next
- ✅ For Each/In
- ✅ Do While/Until
- ✅ With/End With
- ✅ Select/Case
- ✅ Sub/Function definitions
- ✅ On Error Resume Next

**Game API** (BAM):
- ✅ PlaySound, PlayMusic, StopMusic
- ✅ SetScore, AddScore
- ✅ ShowDMDText
- ✅ Flipper control
- ✅ Table effects (shake, twist)
- ✅ Animation control

---

## Phase 8 Tasks

### Task 1: Extended String Functions (1-2 hours)
**Objective**: Add string manipulation functions commonly used in VBScript

**Functions to Add**:

```typescript
// String searching
InStr(str, substr, [start])           // Find position of substring
InStrRev(str, substr, [start])        // Find from right
StrComp(str1, str2, [case])           // String comparison
StrReverse(str)                        // Reverse string

// String manipulation
Mid(str, start, [len])                // Extract substring (improve existing)
Left(str, n)                          // Left n chars
Right(str, n)                         // Right n chars
Replace(str, find, replace, [count])  // Replace pattern
String(count, char)                   // Repeat char

// Case conversion (improve)
StrConv(str, convType)                // Advanced conversion

// Spacing/padding
LTrim(str)                            // Remove leading spaces
RTrim(str)                            // Remove trailing spaces
Space(count)                          // Repeat space

// Character info
Asc(char)                             // Char to code (opposite of Chr)
IsChar(c)                             // Check if character
```

**Implementation Strategy**:
- Add to `_vbsXpr()` function in script-engine.ts
- Use native JavaScript string methods
- Handle edge cases (negative indices, out of bounds)

**Example Implementation**:
```typescript
.replace(/\bInStr\(([^,]+),([^,)]+)(?:,([^)]+))?\)/gi, (m, str, sub, start) => {
  const s = _vbsXpr(str);
  const substr = _vbsXpr(sub);
  const startIdx = start ? _vbsXpr(start) + ' - 1' : '0';
  return `(${s}.indexOf(${substr}, ${startIdx}) + 1)`;  // VB returns 1-based
})
```

---

### Task 2: Array Functions (1-2 hours)
**Objective**: Add array manipulation functions

**Functions to Add**:

```typescript
// Array creation/info
Array(...)                            // Create array
UBound(arr, [dim])                    // Upper bound
LBound(arr, [dim])                    // Lower bound
IsArray(var)                          // Check if array

// Array operations
ReDim(var, size1, [size2], ...)      // Resize array
Erase(var)                            // Clear array
Filter(arr, match, [include])         // Filter array
Sort(arr)                             // Sort array
Reverse(arr)                          // Reverse array
Join(arr, [sep])                      // Array to string
Split(str, [sep])                     // String to array

// Array searching
IndexOf(arr, val)                     // Find index
Contains(arr, val)                    // Check contains
LastIndexOf(arr, val)                 // Last occurrence

// Array modifications
Push(arr, val, ...)                   // Add to end
Pop(arr)                              // Remove from end
Shift(arr)                            // Remove from start
Unshift(arr, val, ...)                // Add to start
```

**Implementation Strategy**:
- Add array helper functions to buildFPScriptAPI()
- Create array object wrapper with methods
- Handle VB array syntax (Arr(i) = val)

**Example**:
```typescript
const arrayAPI = {
  Split: (str: string, sep: string = ' ') => String(str).split(sep),
  Join: (arr: any[], sep: string = ',') => arr.join(sep),
  UBound: (arr: any[]) => (Array.isArray(arr) ? arr.length - 1 : -1),
  LBound: (arr: any[]) => (Array.isArray(arr) ? 0 : -1),
};
```

---

### Task 3: Date/Time Functions (1.5-2 hours)
**Objective**: Add date and time functions

**Functions to Add**:

```typescript
// Date functions
Now()                                 // Current date/time
Date()                                // Current date
Time()                                // Current time
DateValue(str)                        // Parse date string
TimeValue(str)                        // Parse time string

// Date components
Year(date)                            // Extract year
Month(date)                           // Extract month (1-12)
Day(date)                             // Extract day (1-31)
Hour(date)                            // Extract hour (0-23)
Minute(date)                          // Extract minute (0-59)
Second(date)                          // Extract second (0-59)
Weekday(date, [mode])                 // Day of week (0-6 or 1-7)

// Date arithmetic
DateAdd(interval, num, date)          // Add time
DateDiff(interval, date1, date2)      // Difference between dates
DateSerial(year, month, day)          // Create date
TimeSerial(hour, minute, second)      // Create time

// Date formatting
FormatDate(date, [format])            // Format date string
FormatTime(time, [format])            // Format time string

// Timer functions
GetTickCount()                        // Milliseconds since system start
```

**Implementation Strategy**:
- Use JavaScript Date object internally
- Map VB date intervals to JS equivalents (yyyy, m, d, h, n, s)
- Return VB-compatible date values (number or Date)

**Example**:
```typescript
const dateAPI = {
  Now: () => new Date(),
  Year: (d: Date) => new Date(d).getFullYear(),
  Month: (d: Date) => new Date(d).getMonth() + 1,  // VB uses 1-12
  DateAdd: (interval: string, num: number, date: Date) => {
    const d = new Date(date);
    switch (String(interval).toLowerCase()) {
      case 'yyyy': d.setFullYear(d.getFullYear() + num); break;
      case 'm': d.setMonth(d.getMonth() + num); break;
      case 'd': d.setDate(d.getDate() + num); break;
      case 'h': d.setHours(d.getHours() + num); break;
    }
    return d;
  },
};
```

---

### Task 4: Game Object Queries (1.5-2 hours)
**Objective**: Add ability to query and interact with game objects

**Functions to Add**:

```typescript
// Object queries
GetElement(name)                      // Get element by name
GetElementByID(id)                    // Get element by ID
ListElements([type])                  // List all elements
FindElement(predicate)                // Find by condition
GetElementCount([type])               // Count elements

// Element info
GetElementName(obj)                   // Get object name
GetElementType(obj)                   // Get object type
GetElementPosition(obj)               // Get X, Y position
GetElementScore(obj)                  // Get object's score value

// Element modification
SetElementEnabled(obj, enabled)       // Enable/disable
SetElementVisible(obj, visible)       // Show/hide
SetElementColor(obj, color)           // Change color (hex)
SetElementRotation(obj, angle)        // Rotate object

// Element actions
TriggerElement(obj)                   // Trigger element
ResetElement(obj)                     // Reset to default
ActivateElement(obj)                  // Activate
DeactivateElement(obj)                // Deactivate

// Element properties
GetProperty(obj, propName)            // Get property
SetProperty(obj, propName, value)     // Set property
HasProperty(obj, propName)            // Check property exists
GetProperties(obj)                    // List all properties
```

**Implementation Strategy**:
- Create element registry in game.ts
- Expose through script API
- Add getter/setter proxies for property access

**Example**:
```typescript
const elementAPI = {
  GetElement: (name: string) => {
    // Search in bumpers, targets, flippers, etc.
    // Return element or null
  },
  GetElementPosition: (obj: any) => {
    if (!obj || !obj.mesh) return { x: 0, y: 0 };
    return { x: obj.mesh.position.x, y: obj.mesh.position.y };
  },
  SetElementColor: (obj: any, color: number) => {
    if (obj?.mesh?.material) {
      obj.mesh.material.color.setHex(color);
    }
  },
};
```

---

## Task 5: Improved Error Handling (1 hour)
**Objective**: Better error handling and debugging support

**Additions**:

```typescript
// Error handling
On Error GoTo label              // Error handling (basic)
Err.Number                        // Error number
Err.Description                  // Error message
Err.Raise(num, [source])         // Raise error

// Debugging
Debug.Print(msg)                 // Debug output
Assert(condition, [msg])         // Assertion
SetBreakpoint()                  // Set breakpoint (no-op for web)
EnableDebugMode([enabled])       // Toggle debug mode

// Logging
LogMessage(msg, [level])         // Log message
LogError(msg)                    // Log error
LogWarning(msg)                  // Log warning
```

**Implementation Strategy**:
- Extend existing error handling
- Map to console methods
- Add debug output window

---

## Task 6: Utility Functions (1-1.5 hours)
**Objective**: Add misc utility functions

**Functions to Add**:

```typescript
// Type checking
IsNull(var)                      // Check for null/Nothing
IsEmpty(var)                     // Check for empty
IsNumeric(var)                   // Check if numeric
IsString(var)                    // Check if string
IsBoolean(var)                   // Check if boolean
IsObject(var)                    // Check if object
TypeName(var)                    // Get type name

// Math functions (extended)
Sin(angle)                       // Sine (radians)
Cos(angle)                       // Cosine (radians)
Tan(angle)                       // Tangent (radians)
Atn(val)                         // Arctangent
Log(val)                         // Natural logarithm
Exp(val)                         // E^x
Pow(base, exp)                   // Power

// Random
RandomInt(min, max)              // Random integer in range
RandomFloat(min, max)            // Random float in range
RandomChoice(arr)                // Random element from array
Shuffle(arr)                     // Shuffle array

// Constants
Constants.Pi                     // π (3.14159...)
Constants.E                      // e (2.71828...)
Constants.VT_NULL, VT_EMPTY, etc. // VB type constants
```

---

## Implementation Priorities

### High Priority (Critical) - Do First
1. **String functions** (InStr, Left, Right, Replace, Split)
2. **Array functions** (Array, UBound, LBound, Split, Join)
3. **Basic date/time** (Now, Year, Month, Day)
4. **Element queries** (GetElement, GetElementPosition)

### Medium Priority (Important) - Do Second
5. **Extended date functions** (DateAdd, DateDiff)
6. **Advanced element queries** (SetElementColor, TriggerElement)
7. **Type checking functions** (IsNull, IsNumeric, etc.)

### Lower Priority (Nice to Have) - Do Last
8. **Advanced math** (Sin, Cos, Tan)
9. **Debug/logging** (Debug.Print, LogMessage)
10. **Utility functions** (RandomInt, Shuffle)

---

## Files to Create/Modify

### New Files
1. `src/scripts/vbscript-extended.ts` — Extended VBScript functions (200-300 lines)
2. `src/scripts/vbscript-strings.ts` — String functions (150-200 lines)
3. `src/scripts/vbscript-arrays.ts` — Array functions (150-200 lines)
4. `src/scripts/vbscript-dates.ts` — Date/time functions (150-200 lines)
5. `src/scripts/vbscript-elements.ts` — Element query functions (150-200 lines)

### Modified Files
1. `src/script-engine.ts` — Integrate new functions into transpiler
2. `src/game.ts` — Add element registry and queries
3. `src/types.ts` — Define element interfaces (if needed)

---

## Expected Code Impact

### Line Count
- New functions: 800-1000 lines total
- Modifications: 100-150 lines in existing files
- Total: ~900-1150 lines

### Bundle Impact
- New functions: ~8-12 KB gzipped
- Total increase: ~0.4-0.6% of main bundle

### Build Time
- Current: 829ms
- Expected: 850-900ms

### Performance
- No runtime performance impact (transpilation time)
- Zero impact on gameplay frame rate

---

## Testing Strategy

### Unit Tests
- [ ] String functions with edge cases (empty strings, special chars)
- [ ] Array functions with various data types
- [ ] Date functions with different formats
- [ ] Element queries with different object types
- [ ] Error handling and edge cases

### Integration Tests
- [ ] Test with actual Future Pinball scripts
- [ ] Verify function calls work in handlers
- [ ] Test function chains (nested calls)
- [ ] Verify proper error handling

### Compatibility Tests
- [ ] Run existing test tables
- [ ] Verify no regressions
- [ ] Check console output (no unexpected errors)

---

## Success Criteria

✅ All 6 task categories implemented
✅ 50+ VBScript functions available
✅ Zero TypeScript errors
✅ Build time <900ms
✅ No performance regressions
✅ 90%+ compatibility with VBScript usage patterns
✅ Comprehensive documentation
✅ Tested with sample scripts

---

## Timeline Estimate

| Task | Hours | Status |
|------|-------|--------|
| 1. String Functions | 1-2 | PENDING |
| 2. Array Functions | 1-2 | PENDING |
| 3. Date/Time Functions | 1.5-2 | PENDING |
| 4. Element Queries | 1.5-2 | PENDING |
| 5. Error Handling | 1 | PENDING |
| 6. Utility Functions | 1-1.5 | PENDING |
| **Total** | **5-8 hours** | **PENDING** |

---

## Next Steps

1. Begin with Task 1 (String Functions)
2. Create extended VBScript functions module
3. Integrate into script-engine transpiler
4. Test with sample VBScript
5. Continue with Tasks 2-6 in priority order
6. Final testing and documentation

---

**Status**: Ready to implement
**Complexity**: Medium (straightforward function mapping)
**Risk Level**: Low (additive functionality, no breaking changes)
**Value**: High (enables many more VBScript features)

