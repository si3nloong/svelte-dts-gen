<script>
  export let title = "";

  let open = true;

  const toggleComponent = () => {
    open = !open;
  };
</script>

<slot {title} {toggleComponent} />

<style>
  /* your styles go here */
</style>
