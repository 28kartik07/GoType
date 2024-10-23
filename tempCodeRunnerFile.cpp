#include <iostream>
#include <sstream>
#include <unordered_set>
#include <algorithm>
using namespace std;

string first_repeated_word(const string& sentence) {
    // Delimiters to remove
    string delimiters = ",.;:-";
    string cleaned_sentence = sentence;

    // Remove the specified delimiters
    for (char d : delimiters) {
        cleaned_sentence.erase(remove(cleaned_sentence.begin(), cleaned_sentence.end(), d), cleaned_sentence.end());
    }

    // Convert to lowercase for case-insensitivity
    transform(cleaned_sentence.begin(), cleaned_sentence.end(), cleaned_sentence.begin(), ::tolower);

    // Split the sentence into words
    unordered_set<string> word_set;
    stringstream ss(cleaned_sentence);
    string word;

    while (ss >> word) {  // Reading word by word
        // Check if the word has been seen before
        if (word_set.find(word) != word_set.end()) {
            return word;  // Return the first repeated word
        }
        word_set.insert(word);
    }

    return "NONE";  // If no repeated word is found
}

int main() {
    string sentence;
    cout << "Enter a sentence: ";
    getline(cin, sentence);

    string result = first_repeated_word(sentence);
    cout << "First repeated word: " << result << endl;

    return 0;
}
