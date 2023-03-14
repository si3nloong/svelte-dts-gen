<script lang="ts">
  import { createEventDispatcher } from "svelte";

  const d = createEventDispatcher<{ click: string; xxx: {} }>();
  d("click", "ok");
</script>

<button on:change on:click={() => d("xxx", {})}>Click</button>

<style>
</style>
