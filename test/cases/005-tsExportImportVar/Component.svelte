<script lang="ts">
  import type { Msg } from "./index";

  export let title = "";
  export let message: Msg;
</script>

<h1>{title}</h1>
<div>{message}</div>

<style>
</style>
