export const solutions = {
  "py-basics-lab": `name = "Ada"
level = 7
print(f"Player {name} reached level {level}.")`,

  "py-control-lab": `total = 0
for number in range(1, 11):
    if number % 2 == 0:
        print(number)
        total += number
print(f"Total of even numbers: {total}")`,

  "py-functions-lab": `def average(numbers):
    if not numbers:
        return 0
    return sum(numbers) / len(numbers)


scores = [8, 10, 6]
print(f"Average score: {average(scores)}")`,

  "py-collections-lab": `prices = {"apple": 2, "banana": 1, "cherry": 5}
prices["kiwi"] = 3
prices["apple"] += 1
for fruit, price in prices.items():
    print(f"{fruit} costs {price}")`,

  "py-project-lab": `def ask_number():
    while True:
        text = input("Give me a whole number: ")
        try:
            return int(text)
        except ValueError:
            print("That was not a whole number. Try again.")


number = ask_number()
print(f"The square is {number * number}")`,
};
