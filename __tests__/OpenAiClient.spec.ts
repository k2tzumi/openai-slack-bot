import { OpenAiClient } from "../src/OpenAiClient";

console.warn = jest.fn();

const mockFetch = jest.fn();
let response: {};

UrlFetchApp.fetch = mockFetch;

const responseMock = {
    getResponseCode: jest.fn(function () {
        return 200;
    }),
    getContentText: jest.fn(function () {
        return JSON.stringify(response);
    }),
};
mockFetch.mockReturnValue(responseMock);

describe('OpenAiClient', () => {
    describe('completions', () => {
        it('success', () => {
            const client = new OpenAiClient('token');
            response = {
                "id": "cmpl-uqkvlQyYK7bGYrRHQ0eXlWi7",
                "object": "text_completion",
                "created": 1589478378,
                "model": "text-davinci-003",
                "choices": [
                  {
                    "text": "\n\nThis is indeed a test",
                    "index": 0,
                    "logprobs": null,
                    "finish_reason": "length"
                  }
                ],
                "usage": {
                  "prompt_tokens": 5,
                  "completion_tokens": 7,
                  "total_tokens": 12
                }
              };
            const actual = client.completions('prompt');
            expect(mockFetch.mock.calls[0][0]).toContain('completions');
            expect(mockFetch.mock.calls[0][1]).toHaveProperty("payload",  "{\"model\":\"text-davinci-003\",\"prompt\":\"prompt\",\"temperature\":0.5,\"top_p\":0.5,\"frequency_penalty\":0.9,\"max_tokens\":1000}");
            expect(actual).toStrictEqual(response);
        });
    });
});
