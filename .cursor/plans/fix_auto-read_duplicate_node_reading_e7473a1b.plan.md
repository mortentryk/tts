# Fix Auto-Read Duplicate Node Reading

## Problem

The auto-read feature re-reads the same node after the user says the right word and navigates to a new node. This happens because:

1. **Line 1343** sets `lastAutoReadSceneIdRef.current = passageIdAtReadStart` immediately when the effect runs, BEFORE async narration starts
2. When the user navigates via voice command, `goTo` clears the ref (line 1107) and updates `currentId`
3. The new node's auto-read effect runs and may set the ref again
4. The old effect's async narration is still running, creating a race condition
5. The premature ref assignment at line 1343 can cause the system to think a node was already read when it wasn't

## Solution

Remove the premature ref assignment at line 1343. The ref should only be set AFTER narration completes successfully (which is already correctly done at line 1322). The early check at line 1285 (`if (lastAutoReadSceneIdRef.current === currentId)`) will still work correctly because:

- When navigation happens, `goTo` clears the ref to `null` (line 1107)
- The new node's effect will see `null !== currentId` and proceed
- The ref will only be set after narration completes, preventing duplicates

## Changes

- **File**: `app/story/[storyId]/page.tsx`
- **Line 1343**: Remove the line that sets `lastAutoReadSceneIdRef.current = passageIdAtReadStart` before async narration starts
- The ref will only be set at line 1322 after successful narration completion, which already has proper guards (`!cancelled && passageIdAtReadStart === currentId`)

## Testing

After the fix, verify:

1. Auto-read reads a node once
2. User says the right word to navigate
3. New node is read only once (not