<template>
    <div class="abc">{{ number }}</div>
</template>

<script>
import { ref } from 'vue';
export default {
    setup() {
        const number = ref(1234);
        return {
            number
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