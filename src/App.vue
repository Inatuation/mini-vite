<template>
    <div class="abc">{{ title }}</div>
</template>

<script>
import { ref } from 'vue';
export default {
    setup() {
        const title = ref('hello world');
        return {
            title
        }
    }
}
</script>

<style>
.abc {
    background-color: red;
    color: #ffffff;
}
</style>