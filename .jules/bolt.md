## 2024-05-18 - FlatList Nested in ScrollView Anti-Pattern
**Learning:** Nesting a `<FlatList>` with `scrollEnabled={false}` inside a `<ScrollView>` breaks the internal virtualization of the FlatList. React Native renders all elements of the FlatList immediately because the parent ScrollView forces it to expand to its full height.
**Action:** Always use a single root `<FlatList>` and utilize `ListHeaderComponent` and `ListFooterComponent` for any UI elements that should scroll along with the list.
## 2024-07-03 - Test Boundary Coverage
**Learning:** Pure logic functions with tier configurations are highly susceptible to off-by-one errors. Expanding test coverage precisely along transition borders prevents regressions.
**Action:** When adding tests for numerical mapping logic, always include the boundaries (n-1, n, n+1) and unpredictable edge cases like `null`, `undefined`, and decimals.

## 2024-07-03 - Fixing Typescript type checks in CI
**Learning:** CI failures for typescript can often be due to small things like returning JSX.Element without proper configuration or bad tuple indexing (`[string]`). Fix those type checks along with unit tests.
**Action:** Run `npx tsc --noEmit` to verify there are no typescript issues that would fail CI before submitting.
