```bash
protoc -I=. simplechat.proto \
  --js_out=import_style=commonjs:generate \
  --grpc-web_out=import_style=commonjs,mode=grpcwebtext:generate

yarn
yarn webpack

node server.js #ポート9090でリッスンします

docker build -t helloworld/envoy -f ./envoy.Dockerfile .
docker run -d -p 8080:8080 helloworld/envoy

npx -p node-static static -p 8081
```
