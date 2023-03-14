<script>
  /**
   * Title is the button text
   *
   * @type {string}
   */
  export let title;

  /** @type {boolean} */
  export let expanded;

  export let disabled = false;
</script>

<button on:click {expanded} {disabled}>{title}</button>

<style>
  /* your styles go here */
</style>
