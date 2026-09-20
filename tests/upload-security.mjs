import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { detectImage, boundedBody, configureLimits, reencodeImage, MAX_BYTES } from '../supabase/functions/secure-image-upload/image.js';
import { safeRedirect } from '../src/lib/redirect.js';
const magick = await import(pathToFileURL(process.argv[2]).href);
await magick.initializeImageMagick(await readFile(new URL('x86/magick.wasm',pathToFileURL(process.argv[2]))));
configureLimits(magick);
for (const value of ['//evil.test','/\\evil.test','https://evil.test','/\nevil']) assert.equal(safeRedirect(value),'/');
assert.equal(safeRedirect('/products/abc?from=cart'),'/products/abc?from=cart');
for (const value of ['<svg xmlns="http://www.w3.org/2000/svg"/>','<html>hello</html>','fake.jpg']) assert.throws(()=>detectImage(new TextEncoder().encode(value)));
assert.throws(()=>detectImage(new Uint8Array(MAX_BYTES+1)));
assert.throws(()=>reencodeImage(new Uint8Array([255,216,255,0]),'products',magick));
const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC','base64'));
for (const format of [magick.MagickFormat.Jpeg,magick.MagickFormat.WebP]) {
 const encoded=magick.ImageMagick.read(png,image=>image.write(format,bytes=>Uint8Array.from(bytes)));
 assert.equal(detectImage(reencodeImage(encoded,'products',magick)),'Jpeg');
}
const wide=magick.ImageMagick.read(png,image=>{ image.resize(2100,2100); return image.write(magick.MagickFormat.Png,bytes=>Uint8Array.from(bytes)); });
for (const [kind,width] of [['avatars',512],['products',2048]]) {
 const resized=reencodeImage(wide,kind,magick);
 magick.ImageMagick.read(resized,image=>assert.equal(image.width,width));
}
const output=reencodeImage(png,'avatars',magick);
assert.equal(detectImage(output),'Jpeg');
const polyglot=new Uint8Array(png.length+20);polyglot.set(png);polyglot.set(new TextEncoder().encode('<script>bad</script>'),png.length);
assert.equal(Buffer.from(reencodeImage(polyglot,'products',magick)).includes(Buffer.from('<script>')),false);
await assert.rejects(boundedBody(new ReadableStream({start(c){ c.enqueue(new Uint8Array(MAX_BYTES)); c.enqueue(new Uint8Array(1));c.close(); }})));
assert.deepEqual(await boundedBody(new ReadableStream({start(c){c.enqueue(png);c.close();}})),png);
console.log('PASS upload signature, malformed image, decode/re-encode, trailing active content, streamed size cap, and redirect checks');
