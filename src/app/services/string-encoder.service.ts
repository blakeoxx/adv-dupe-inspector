export class StringEncoderService {
    static encodeHTML(s: string): string {
        return $('<div/>').text(s).html();
    }

    static decodeHTML(s: string): string {
        return $('<div/>').html(s).text();
    }
}
