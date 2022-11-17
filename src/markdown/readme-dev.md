## Cheat sheet

### Native element access pattern

Element refs are implemented in the composition api by adding a "ref" attribute to the element, then creating a ref of the same name in the script setup:

```
<q-input ref="theInput">

<script setup>
import {ref} from 'vue'
const theInput = ref()

//access the el
const el = theInput.value.$el

//do something to it
el.value('test')

</script>
```

### Dereferencing and array

```
 const theDereferencedArray = JSON.parse(JSON.stringify(reactiveArray))
```

### Child component binding patterns

NOTE: Vue loader destructures v-model to v-model="value" to :model-value="value" & @update:model-value="$emit('update:modelValue',$event) vs standard vue destructures
:value="value" and @change="$emit('update:modelValue', $event.target.value)

https://github.com/Darkzarich/vue3-base-components/blob/master/src/components/Base/BaseSelect.vue

https://github.com/quasarframework/quasar/blob/6cc5cd8c0f0e2a3188b59af1cd44435adee164bf/ui/src/components/select/QSelect.js#L40-L42

Using computed:

```

```

Using watch:

```

```

## Links

Extending vue.js components:
https://vuejsdevelopers.com/2017/06/11/vue-js-extending-components/

https://forum.quasar-framework.org/topic/696/how-to-building-components-with-quasar/5?_=1613333141414
