<script>
  /**
   * Title is the button text
   *
   * @type {string}
   */
  export let title;

  /** @type {boolean} */
  export let expanded;

  /**
   * @type {number}
   */
  export let num;

  export const type = "submit";

  export let disabled = false;
</script>

<button on:click {type} {expanded} {disabled}>{title} {num}</button>

<style>
  /* your styles go here */
</style>
