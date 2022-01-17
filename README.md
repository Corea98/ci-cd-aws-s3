# Integración y despliegue continuo a un bucket de AWS S3

## Consideraciones

- Las ramas principales son: develop, staging y main
- Es un monorepo
- Los Workflows para Frontend y Backend son independientes
- El despligue de Frontend solo debe ejecutarse cuando se modifique el proyecto de Angular
- En cada despliegue deben de borrarse archivos antiguos en el bucket de S3


## Workflow de github actions para Frontend


Para ejecutar el Workflow debe hacerse un push a cualquier rama o un pull request a las ramas principales, el workflow se ejecuta solo cuando se modifica la carpeta que contiene el Frontend o el Workflow.

```
on:
  push:
    paths: 
      - 'frontend/**'
      - '.github/workflows/deploy-aws-s3.yml'
  pull_request:
    branches: [ main, develop, staging ]
    paths: 
      - 'frontend/**'
      - '.github/workflows/deploy-aws-s3.yml'
```


Permisos necesarios para actualizar el contenido del bucket de S3

```
permissions:
  id-token: write
  contents: read
```


Configuración del Runner

```
defaults:
  run:
    working-directory: frontend
runs-on: ubuntu-latest
```

### Steps:

```
- uses: actions/checkout@v2

- name: Get branch name
  run: echo "##[set-output name=actual;]$(echo ${{ github.base_ref }}${GITHUB_REF#refs/heads/})"
  id: branch_name

- name: Get environment
  run: |
    echo "##[set-output name=actual;]$(echo ${{ 
      steps.branch_name.outputs.actual == 'main' && 'prod' || 
      steps.branch_name.outputs.actual == 'staging' && 'stg' || 
      steps.branch_name.outputs.actual == 'develop' && 'dev' || 
      'other' 
    }})"        
  id: environment

- name: Setup node
  if: success()
  uses: actions/setup-node@v1
  with:
    node-version: 14

- name: Cache node modules
  id: cache-nodemodules
  uses: actions/cache@v2
  env:
    cache-name: cache-node-modules
  with:
    path: frontend/node_modules
    key: ${{ runner.os }}-build-${{ env.cache-name }}-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-build-${{ env.cache-name }}-
      ${{ runner.os }}-build-
      ${{ runner.os }}-

- name: Install dependencies
  if: success() && steps.cache-nodemodules.outputs.cache-hit != 'true'
  run: npm ci

- name: Test
  if: success()
  run: |
    npm run lint
    npm run test:ci

- name: Build
  if: success() && steps.environment.outputs.actual != 'other'
  run: |
    npm run build:${{ steps.environment.outputs.actual }}

- name: Setup AWS credentials
  if: success() && github.event_name == 'push' && steps.environment.outputs.actual != 'other'
  uses: aws-actions/configure-aws-credentials@v1
  with:
    aws-region: ${{ secrets.AWS_REGION }}
    role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
    role-session-name: my-github-role

- name: Deploy
  if: success() && github.event_name == 'push' && steps.environment.outputs.actual != 'other'
  run: |
    if [ '${{ steps.env.outputs.actual }}' == 'prod' ]; then
      aws s3 sync ${{ secrets.FRONTEND_BUILD_PATH }} s3://${{ secrets.AWS_S3_PRODUCTION_NAME }} --delete
    elif [ '${{ steps.env.outputs.actual }}' == 'stg' ]; then
      aws s3 sync ${{ secrets.FRONTEND_BUILD_PATH }} s3://${{ secrets.AWS_S3_STAGING_NAME }} --delete
    else
      aws s3 sync ${{ secrets.FRONTEND_BUILD_PATH }} s3://${{ secrets.AWS_S3_DEVELOP_NAME }} --delete
    fi

- name: Print branch and environment
  run: |
    echo "Actual branch - ${{ steps.branch_name.outputs.actual }}"
    echo "Actual environment - ${{ steps.environment.outputs.actual }}"
```