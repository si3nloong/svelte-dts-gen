<script>
  import { createEventDispatcher } from "svelte";

  const d = createEventDispatcher();
  d("click");
</script>

<button on:change on:click={() => d("xxx")}>Click</button>

<!-- markup (zero or more items) goes here -->
<style>
  /* your styles go here */
</style>
