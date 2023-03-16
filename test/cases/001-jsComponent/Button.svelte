<script>
  export let name = "",
    title = "Click Me";
  export let disabled = true;
  let type = "submit";
</script>

<button {name} {type} {disabled}>{title}</button>

<style>
  /* your styles go here */
</style>
