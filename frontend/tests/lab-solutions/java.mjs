export const solutions = {
  "java-basics-lab": `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String name = scanner.next();
        int level = scanner.nextInt();
        double price = scanner.nextDouble();

        System.out.println("Player " + name + " is on level " + level + ".");
        System.out.println("Next level: " + (level + 1));
        System.out.println("Price: " + String.format("%.2f", price));
    }
}
`,
  "java-control-lab": `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int limit = scanner.nextInt();

        for (int i = 1; i <= limit; i++) {
            if (i % 2 == 0) {
                System.out.println(i + " is even");
            } else {
                System.out.println(i + " is odd");
            }
        }
    }
}
`,
  "java-methods-lab": `import java.util.Scanner;

public class Main {
    static int add(int a, int b) {
        return a + b;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int a = scanner.nextInt();
        int b = scanner.nextInt();
        System.out.println(a + " + " + b + " = " + add(a, b));
    }
}
`,
  "java-oop-lab": `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String name = scanner.nextLine().trim();
        int age = scanner.nextInt();

        Person person = new Person(name, age);
        System.out.println(person.getName() + " is " + person.getAge());
        System.out.println("Next year: " + (person.getAge() + 1));
    }
}

class Person {
    private String name;
    private int age;

    Person(String name, int age) {
        this.name = name;
        this.age = age;
    }

    String getName() {
        return name;
    }

    int getAge() {
        return age;
    }
}
`,
  "java-collections-lab": `import java.util.ArrayList;
import java.util.HashMap;
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String line = scanner.nextLine();
        String name = scanner.nextLine();
        int score = scanner.nextInt();

        ArrayList<String> skills = new ArrayList<>();
        for (String skill : line.split(",")) {
            skills.add(skill);
        }

        HashMap<String, Integer> scores = new HashMap<>();
        scores.put(name, score);

        for (String skill : skills) {
            System.out.println(skill);
        }
        System.out.println(name + " scored " + scores.get(name));
    }
}
`,
};
