<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let initialNumber: number = 0,
    disabled = false;

  let dispatch = createEventDispatcher<{ change: number }>();
  let number = initialNumber;

  $: dispatch("change", number);
</script>

<button on:click={() => (number += 1)} {disabled}>Cliques: {number}</button>
