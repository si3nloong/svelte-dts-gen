<script lang="ts">
  import type { Animal, Msg } from "./index";

  export let title = "";
  export let message: Msg, animal: Animal;
  export let animal2: Animal;
</script>

<h1>{title}</h1>
<div>{message}</div>
{@debug animal}
{@debug animal2}

<style>
</style>
