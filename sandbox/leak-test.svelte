<script>
  import { onDestroy } from "svelte";
  import { page } from "$app/stores";

  // 1. BAD: Wild subscription (Should error immediately)
  page.subscribe((val) => console.log(val));

  // 2. BAD: Assigned but forgotten (Should error at the end)
  const unusedUnsub = page.subscribe((val) => {});

  // 3. GOOD: Assigned and cleaned up (Should pass)
  const safeUnsub = page.subscribe((val) => {});
  onDestroy(safeUnsub); // or safeUnsub();
</script>
