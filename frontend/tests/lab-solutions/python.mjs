export const solutions = {
  "py-basics-lab": `name = input()
level = int(input())

print(f"Player {name} reached level {level}.")`,

  "py-control-lab": `limit = int(input())
total = 0

for number in range(1, limit + 1):
    if number % 2 == 0:
        print(number)
        total += number

print(f"Total of even numbers: {total}")`,

  "py-functions-lab": `def average(numbers):
    if not numbers:
        return 0
    return sum(numbers) / len(numbers)


scores = [int(part) for part in input().split()]
print(f"Average score: {average(scores):.2f}")`,

  "py-collections-lab": `prices = {"apple": 2, "banana": 1, "cherry": 5}
fruit = input()
price = int(input())
prices[fruit] = price
prices["apple"] += 1

for fruit_name, price_value in prices.items():
    print(f"{fruit_name} costs {price_value}")`,

  "py-project-lab": `def ask_number():
    while True:
        text = input()
        try:
            return int(text)
        except ValueError:
            print("That was not a whole number. Try again.")


number = ask_number()
print(f"The square is {number * number}")`,
};
