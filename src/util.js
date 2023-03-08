export function toPaskalCase(str) {
  // Replace all non-alphanumeric characters with spaces
  str = str.replace(/[^A-Za-z0-9]/g, " ");

  // Convert string to lowercase and split into words
  var words = str.toLowerCase().split(" ");

  // Convert the first letter of each word to uppercase
  for (var i = 0; i < words.length; i++) {
    words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
  }

  // Concatenate the words and return the result
  return words.join("");
}
