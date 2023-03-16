<script>
  const num = 1222.33;
  // your script goes here
  export const readonlyText = "";
  export let name = "";
  export let flag = true;
  export let arr = ["a", "b", "c"],
    list = Array.from([]);
  export let map = new Map();
  export let obj = { name: "" };
  export let ref = num;
</script>

<button on:click {name}>{readonlyText}</button>

<style>
  /* your styles go here */
</style>
