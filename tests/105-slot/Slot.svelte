<script>
  export let open = false;
</script>

{#if open}
  <aside>
    <header><slot name="header" /></header>
    <div><slot>Content Here</slot></div>
    <footer><slot name="footer" /></footer>
  </aside>
{/if}

<style>
  /* your styles go here */
</style>
