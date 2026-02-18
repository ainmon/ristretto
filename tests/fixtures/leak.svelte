<script>
  let badSubscription = store.subscribe(() => {
    console.log(value);
  });
</script>

<h1>Leak!</h1>
