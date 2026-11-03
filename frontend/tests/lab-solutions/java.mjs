export const solutions = {
  "java-basics-lab": `public class Basics {
    public static void main(String[] args) {
        int level = 3;
        double price = 4.5;
        String name = "Ada";
        System.out.println(name + " is on level " + level);
        System.out.println("Price: " + price);
    }
}
`,
  "java-control-lab": `public class Control {
    public static void main(String[] args) {
        for (int i = 1; i <= 5; i++) {
            if (i % 2 == 0) {
                System.out.println(i + " is even");
            } else {
                System.out.println(i + " is odd");
            }
        }
    }
}
`,
  "java-methods-lab": `public class Methods {
    static int add(int a, int b) {
        return a + b;
    }

    public static void main(String[] args) {
        int total = add(4, 5);
        System.out.println("Total: " + total);
    }
}
`,
  "java-oop-lab": `public class Oop {
    public static void main(String[] args) {
        Person ada = new Person("Ada", 36);
        System.out.println(ada.getName() + " is " + ada.getAge());
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

public class Collections {
    public static void main(String[] args) {
        ArrayList<String> skills = new ArrayList<>();
        skills.add("Java");
        skills.add("SQL");
        for (String skill : skills) {
            System.out.println(skill);
        }

        HashMap<String, Integer> scores = new HashMap<>();
        scores.put("Ada", 10);
        scores.put("Linus", 7);
        System.out.println("Ada: " + scores.get("Ada"));
    }
}
`,
};
