import { IELTSPromptPreset } from "./types";

export const IELTS_PRESETS: IELTSPromptPreset[] = [
  {
    id: "task2-education",
    taskType: "2",
    title: "University Education: Free vs. Paid",
    description: "Discuss both views and give your opinion",
    promptText: "Some people believe that university education should be free for all students. Others think that students should pay for their higher education because it benefits them individually. Discuss both views and give your opinion."
  },
  {
    id: "task2-technology",
    taskType: "2",
    title: "Social Media & Real-life Connections",
    description: "To what extent do you agree or disagree?",
    promptText: "With the rise of social media platforms, people are spending more time communicating online than face-to-face. Some argue that this has weakened real-life social ties. To what extent do you agree or disagree with this opinion?"
  },
  {
    id: "task1-bar-chart",
    taskType: "1",
    title: "Household Energy Consumption",
    description: "Compare and contrast data in a bar chart",
    promptText: "The bar chart below shows the energy consumption of households in five different countries (USA, UK, Germany, China, Japan) in 2025, categorized by heating, cooling, lighting, and appliances. Summarize the information by selecting and reporting the main features, and make comparisons where relevant."
  },
  {
    id: "task1-process",
    taskType: "1",
    title: "Plastic Bottle Recycling Process",
    description: "Describe the steps of a industrial process diagram",
    promptText: "The diagram illustrates the process of recycling plastic bottles to manufacture new products. Summarize the information by selecting and reporting the main features, and make comparisons where relevant."
  },
  {
    id: "task2-environment",
    taskType: "2",
    title: "Urban Traffic Congestion",
    description: "Causes and solutions essay",
    promptText: "In many cities around the world, traffic congestion has become a major problem, leading to severe air pollution and lost productivity. What are the main causes of urban traffic congestion, and what solutions can you propose to solve this problem?"
  }
];
