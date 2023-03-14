<script>
  import Slot from "./Slot.svelte";
</script>

<Slot title={"Hello World"} let:toggleComponent let:title>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div on:click={toggleComponent}>{title}</div>
</Slot>

<style>
  /* your styles go here */
</style>
