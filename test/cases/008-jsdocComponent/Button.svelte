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

  /**
   * class
   * @typedef Item
   * @property {string} a
   * @property {'b'} b
   */
  /**
   * Items of component
   * @type {Item[]} */
  export let items;

  export let disabled = false;
</script>

<button on:click {type} {expanded} {disabled}>{title} {num}</button>
{#each items as item}
  <p>{item.a}</p>
{/each}

<style>
  /* your styles go here */
</style>
